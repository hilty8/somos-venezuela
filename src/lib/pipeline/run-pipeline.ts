/**
 * Run Pipeline - Main pipeline execution logic
 *
 * Flow:
 * 1. Fetch raw items (NEW status)
 * 2. For each raw item:
 *    a. Generate article (writer + template)
 *    b. Validate blocks (FACT → UNVERIFIED if no evidence)
 *    c. Classify article
 *    d. Review article (hard fail + LLM)
 *    e. If fail: rewrite (max 2 times)
 *    f. If pass: publish
 *    g. If still fail: hold
 * 3. Update stats and logs
 */

import { db } from "@/lib/db";
import { generateArticle } from "./generate-article";
import { classifyArticle } from "./classify-article";
import { reviewArticle } from "./review-article";
import { rewriteArticle } from "./rewrite-article";
import { validateBlocks } from "./validate-blocks";
import { generateUniqueSlug } from "./slug-generator";
import type { PipelineRunStats, PipelineLog } from "./types";

const MAX_REWRITE_ATTEMPTS = parseInt(
  process.env.REVIEW_MAX_AUTOFIX_ATTEMPTS || "2",
  10
);

export interface PipelineRunOptions {
  sourceId?: string;
  limit?: number;
}

export interface PipelineRunResult {
  runId: string;
  stats: PipelineRunStats;
  logs: PipelineLog[];
}

/**
 * Execute the article generation pipeline
 */
export async function runPipeline(
  options: PipelineRunOptions = {}
): Promise<PipelineRunResult> {
  const startTime = Date.now();
  const logs: PipelineLog[] = [];
  const stats: PipelineRunStats = {
    total: 0,
    published: 0,
    hold: 0,
    failed: 0,
    llm_calls: 0,
    duration_ms: 0,
  };

  // Create pipeline run record
  const pipelineRun = await db.pipelineRun.create({
    data: {
      status: "RUNNING",
      sourceId: options.sourceId || null,
      limit: options.limit || null,
    },
  });

  const runId = pipelineRun.id;

  try {
    addLog(logs, "info", `Pipeline started (runId: ${runId})`);

    // Fetch raw items
    const rawItems = await fetchRawItems(options);
    stats.total = rawItems.length;
    addLog(logs, "info", `Found ${rawItems.length} raw items to process`);

    if (rawItems.length === 0) {
      addLog(logs, "warn", "No raw items found with NEW status");
      await updatePipelineRun(runId, "COMPLETED", stats, logs);
      return { runId, stats, logs };
    }

    // Process each raw item
    for (const rawItem of rawItems) {
      try {
        addLog(
          logs,
          "info",
          `Processing raw item: ${rawItem.id} (${rawItem.title})`,
          rawItem.id
        );

        await processRawItem(rawItem, stats, logs);
      } catch (error) {
        const errorMessage = (error as Error).message;
        addLog(
          logs,
          "error",
          `Failed to process raw item ${rawItem.id}: ${errorMessage}`,
          rawItem.id
        );
        stats.failed++;

        // Mark raw item as failed
        await db.rawItem.update({
          where: { id: rawItem.id },
          data: {
            status: "FAILED",
            errorReason: errorMessage,
            processingStartedAt: null, // Clear PROCESSING lock
          },
        });
      }
    }

    addLog(
      logs,
      "info",
      `Pipeline completed: ${stats.published} published, ${stats.hold} hold, ${stats.failed} failed`
    );

    stats.duration_ms = Date.now() - startTime;
    await updatePipelineRun(runId, "COMPLETED", stats, logs);
  } catch (error) {
    const errorMessage = (error as Error).message;
    addLog(logs, "error", `Pipeline failed: ${errorMessage}`);
    stats.duration_ms = Date.now() - startTime;
    await updatePipelineRun(runId, "FAILED", stats, logs);
    throw error;
  }

  return { runId, stats, logs };
}

async function fetchRawItems(options: PipelineRunOptions): Promise<any[]> {
  const where: any = { status: "NEW" };

  if (options.sourceId) {
    where.sourceId = options.sourceId;
  }

  return await db.rawItem.findMany({
    where,
    take: options.limit || 100,
    orderBy: { publishedAt: "desc" },
  });
}

async function processRawItem(
  rawItem: any,
  stats: PipelineRunStats,
  logs: PipelineLog[]
): Promise<void> {
  // Step 0: Lock raw item with PROCESSING status
  addLog(logs, "info", "Locking raw item (PROCESSING)...", rawItem.id);
  await db.rawItem.update({
    where: { id: rawItem.id },
    data: {
      status: "PROCESSING",
      processingStartedAt: new Date(),
      lastAttemptAt: new Date(),
      retryCount: rawItem.retryCount + 1,
    },
  });

  // Fetch source for validation context
  const source = await db.source.findUnique({
    where: { id: rawItem.sourceId },
    select: { url: true },
  });

  // Step 1: Generate article
  addLog(logs, "info", "Generating article...", rawItem.id);
  let article = await generateArticle({
    id: rawItem.id,
    sourceId: rawItem.sourceId,
    url: rawItem.url,
    title: rawItem.title,
    content: rawItem.content,
    publishedAt: rawItem.publishedAt,
  });

  // Step 2: Validate blocks (FACT must have evidence)
  addLog(logs, "info", "Validating blocks...", rawItem.id);
  const validation = validateBlocks(article.blocks, {
    rawItemUrl: rawItem.url,
    sourceUrl: source?.url || "",
  });
  article.blocks = validation.blocks;

  if (validation.changedCount > 0) {
    addLog(
      logs,
      "warn",
      `${validation.changedCount} blocks converted from FACT to UNVERIFIED (no evidence)`,
      rawItem.id
    );
  }

  for (const warning of validation.warnings) {
    addLog(logs, "warn", warning, rawItem.id);
  }

  // Step 3: Classify article
  addLog(logs, "info", "Classifying article...", rawItem.id);
  const classification = await classifyArticle(article);
  addLog(
    logs,
    "info",
    `Category: ${classification.category} (confidence: ${classification.confidence.toFixed(2)})`,
    rawItem.id
  );

  // Step 4: Review and rewrite loop (max 3 attempts)
  let currentArticle = article;
  let review = null;
  let attemptNumber = 1;

  while (attemptNumber <= MAX_REWRITE_ATTEMPTS + 1) {
    addLog(
      logs,
      "info",
      `Review attempt ${attemptNumber}/${MAX_REWRITE_ATTEMPTS + 1}...`,
      rawItem.id
    );

    review = await reviewArticle(currentArticle);

    if (review.passed) {
      addLog(
        logs,
        "info",
        `Review passed (score: ${review.scoreTotal.toFixed(1)}/100)`,
        rawItem.id
      );
      break;
    }

    addLog(
      logs,
      "warn",
      `Review failed (score: ${review.scoreTotal.toFixed(1)}/100)`,
      rawItem.id
    );

    if (review.hardFailReasons.length > 0) {
      addLog(
        logs,
        "warn",
        `Hard fail reasons: ${review.hardFailReasons.join("; ")}`,
        rawItem.id
      );
    }

    // If this was the last attempt, break
    if (attemptNumber > MAX_REWRITE_ATTEMPTS) {
      addLog(
        logs,
        "warn",
        `Max rewrite attempts (${MAX_REWRITE_ATTEMPTS}) reached`,
        rawItem.id
      );
      break;
    }

    // Rewrite article
    addLog(logs, "info", `Rewriting article (attempt ${attemptNumber + 1})...`, rawItem.id);
    currentArticle = await rewriteArticle(currentArticle, review, attemptNumber);

    // Re-validate blocks after rewrite
    const rewriteValidation = validateBlocks(currentArticle.blocks);
    currentArticle.blocks = rewriteValidation.blocks;

    attemptNumber++;
  }

  // Step 5: Save article to database
  const slug = await generateUniqueSlug(currentArticle.title);
  const status = review?.passed ? "PUBLISHED" : "HOLD";
  const publishedAt = review?.passed ? new Date() : null;

  addLog(logs, "info", `Saving article (status: ${status})...`, rawItem.id);

  const createdArticle = await db.article.create({
    data: {
      slug,
      title: currentArticle.title,
      summary: currentArticle.summary,
      status,
      publishedAt,
      sourceIds: [rawItem.sourceId],
      rawItemIds: [rawItem.id],
      category: classification.category,
      classifyConfidence: classification.confidence,
      blocks: {
        create: currentArticle.blocks.map((block) => ({
          type: block.type,
          content: block.content,
          sources: block.evidenceUrls,
          order: block.order,
        })),
      },
    },
  });

  // Save all review runs
  if (review) {
    await db.reviewRun.create({
      data: {
        articleId: createdArticle.id,
        attemptNumber,
        passed: review.passed,
        scoreTotal: review.scoreTotal,
        scoresByCategory: review.scoresByCategory,
        feedback: review.feedback,
        hardFailReasons: review.hardFailReasons,
        suggestions: review.suggestions,
      },
    });
  }

  // Mark raw item with final status
  const rawItemStatus = status === "PUBLISHED" ? "PROCESSED" : "HOLD";
  await db.rawItem.update({
    where: { id: rawItem.id },
    data: {
      status: rawItemStatus,
      processingStartedAt: null, // Clear PROCESSING lock
    },
  });

  // Update stats
  if (status === "PUBLISHED") {
    stats.published++;
    addLog(logs, "info", `Article published: /news/${slug}`, rawItem.id, createdArticle.id);
  } else {
    stats.hold++;
    addLog(
      logs,
      "warn",
      `Article held (not published): /admin/articles/${createdArticle.id}`,
      rawItem.id,
      createdArticle.id
    );
  }
}

async function updatePipelineRun(
  runId: string,
  status: "RUNNING" | "COMPLETED" | "FAILED",
  stats: PipelineRunStats,
  logs: PipelineLog[]
): Promise<void> {
  const logsText = logs
    .map(
      (log) =>
        `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    )
    .join("\n");

  await db.pipelineRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      stats,
      logs: logsText,
    },
  });
}

function addLog(
  logs: PipelineLog[],
  level: "info" | "warn" | "error",
  message: string,
  rawItemId?: string,
  articleId?: string
): void {
  logs.push({
    timestamp: new Date(),
    level,
    message,
    rawItemId,
    articleId,
  });
}

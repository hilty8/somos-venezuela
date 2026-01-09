/**
 * Daily Pipeline Worker (G1: Automation)
 * Railway cron entry point for automated article generation
 *
 * Usage:
 *   pnpm worker:daily-pipeline
 *
 * Environment variables:
 *   PIPELINE_MAX_ITEMS_PER_RUN - Max items to process per run (default: 10)
 *   PIPELINE_MAX_ITEMS_PER_SOURCE - Max items per source (default: 5)
 *   PIPELINE_MAX_LLM_CALLS_PER_RUN - Max LLM calls per run (default: 50)
 *   PIPELINE_MAX_RETRY_PER_ITEM - Max retry attempts for FAILED items (default: 2)
 */

import { db } from "../src/lib/db";
import { runPipeline } from "../src/lib/pipeline/run-pipeline";

const MAX_ITEMS_PER_RUN = parseInt(
  process.env.PIPELINE_MAX_ITEMS_PER_RUN || "10",
  10
);
const MAX_ITEMS_PER_SOURCE = parseInt(
  process.env.PIPELINE_MAX_ITEMS_PER_SOURCE || "5",
  10
);
const MAX_RETRY_PER_ITEM = parseInt(
  process.env.PIPELINE_MAX_RETRY_PER_ITEM || "2",
  10
);

async function main() {
  console.log("=== Daily Pipeline Worker Started ===");
  console.log(`Max items per run: ${MAX_ITEMS_PER_RUN}`);
  console.log(`Max items per source: ${MAX_ITEMS_PER_SOURCE}`);
  console.log(`Max retry per item: ${MAX_RETRY_PER_ITEM}`);

  try {
    // Step 1: Get active sources
    const activeSources = await db.source.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    if (activeSources.length === 0) {
      console.log("No active sources found. Exiting.");
      return;
    }

    console.log(`Found ${activeSources.length} active sources`);

    // Step 2: Collect raw items from all sources (up to limit)
    const rawItemsToProcess: any[] = [];
    let totalCollected = 0;

    for (const source of activeSources) {
      // Get NEW items for this source (respecting per-source limit)
      const newItems = await db.rawItem.findMany({
        where: {
          sourceId: source.id,
          status: "NEW",
        },
        take: MAX_ITEMS_PER_SOURCE,
        orderBy: { publishedAt: "desc" },
      });

      // Get retryable FAILED items (retry_count < MAX_RETRY)
      const failedItems = await db.rawItem.findMany({
        where: {
          sourceId: source.id,
          status: "FAILED",
          retryCount: {
            lt: MAX_RETRY_PER_ITEM,
          },
        },
        take: Math.max(1, Math.floor(MAX_ITEMS_PER_SOURCE / 2)), // Reserve some slots for FAILED retry
        orderBy: { lastAttemptAt: "asc" }, // Oldest first
      });

      const sourceItems = [...newItems, ...failedItems];
      console.log(
        `Source "${source.name}": ${newItems.length} NEW + ${failedItems.length} FAILED (retry) = ${sourceItems.length} items`
      );

      // Add to collection (up to global limit)
      for (const item of sourceItems) {
        if (totalCollected >= MAX_ITEMS_PER_RUN) {
          break;
        }
        rawItemsToProcess.push(item);
        totalCollected++;
      }

      if (totalCollected >= MAX_ITEMS_PER_RUN) {
        console.log(`Reached global limit of ${MAX_ITEMS_PER_RUN} items`);
        break;
      }
    }

    if (rawItemsToProcess.length === 0) {
      console.log("No items to process. Exiting.");
      return;
    }

    console.log(
      `Total items to process: ${rawItemsToProcess.length} (${Math.min(totalCollected, MAX_ITEMS_PER_RUN)})`
    );

    // Step 3: Mark collected items as NEW (reset FAILED status for retry)
    const failedIds = rawItemsToProcess
      .filter((item) => item.status === "FAILED")
      .map((item) => item.id);

    if (failedIds.length > 0) {
      await db.rawItem.updateMany({
        where: { id: { in: failedIds } },
        data: { status: "NEW" },
      });
      console.log(`Reset ${failedIds.length} FAILED items to NEW for retry`);
    }

    // Step 4: Run pipeline with collected items
    console.log("Starting pipeline execution...");
    const result = await runPipeline({
      limit: rawItemsToProcess.length, // Process all collected items
    });

    // Step 5: Log results
    console.log("\n=== Pipeline Completed ===");
    console.log(`Run ID: ${result.runId}`);
    console.log(`Total: ${result.stats.total}`);
    console.log(`Published: ${result.stats.published}`);
    console.log(`Hold: ${result.stats.hold}`);
    console.log(`Failed: ${result.stats.failed}`);

    // Summary logs (last 10 lines)
    const lastLogs = result.logs.slice(-10);
    console.log("\nLast 10 log entries:");
    for (const log of lastLogs) {
      console.log(
        `[${log.level.toUpperCase()}] ${log.message}`
      );
    }

    console.log("\n=== Daily Pipeline Worker Completed ===");
  } catch (error) {
    console.error("Daily pipeline worker failed:", error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

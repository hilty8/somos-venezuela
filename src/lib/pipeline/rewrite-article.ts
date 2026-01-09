/**
 * Rewrite Article - Fix issues based on review feedback
 */

import { callLLM } from "@/lib/llm/client";
import { getActivePrompt, getActiveTemplate } from "./get-active-prompts";
import { parseArticleBlocks } from "./validate-blocks";
import type { GeneratedArticle, ReviewResult } from "./types";

/**
 * Rewrite article based on review feedback
 */
export async function rewriteArticle(
  article: GeneratedArticle,
  review: ReviewResult,
  attemptNumber: number
): Promise<GeneratedArticle> {
  // Get active rewrite prompt
  const rewritePrompt = await getActivePrompt("REWRITE");
  if (!rewritePrompt) {
    throw new Error("No active rewrite prompt found");
  }

  const template = await getActiveTemplate();
  if (!template) {
    throw new Error("No active article template found");
  }

  // Build prompt
  const userPrompt = buildRewritePrompt(article, review, attemptNumber, template);

  // Call LLM
  const response = await callLLM("REWRITE", userPrompt, rewritePrompt);

  // Parse JSON response
  let parsedResponse: any;
  try {
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response.content;
    parsedResponse = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Failed to parse rewrite response: ${(error as Error).message}`
    );
  }

  // Extract title and summary
  const title = parsedResponse.title || article.title;
  const summary = parsedResponse.summary || article.summary;

  // Parse blocks
  const blocks = parseArticleBlocks(parsedResponse);

  return {
    title,
    summary,
    blocks,
  };
}

function buildRewritePrompt(
  article: GeneratedArticle,
  review: ReviewResult,
  attemptNumber: number,
  template: any
): string {
  const blocksText = article.blocks
    .map(
      (b, i) =>
        `[Block ${i + 1} - ${b.type}]\n${b.content}\nEvidence: ${b.evidenceUrls.join(", ") || "なし"}`
    )
    .join("\n\n");

  const feedbackText = [
    `総評: ${review.feedback}`,
    "",
    "Hard Fail違反:",
    ...review.hardFailReasons.map((r) => `- ${r}`),
    "",
    "改善提案:",
    ...review.suggestions.map((s) => `- ${s}`),
    "",
    "スコア:",
    `- Evidence: ${review.scoresByCategory.evidence}/100`,
    `- Neutrality: ${review.scoresByCategory.neutrality}/100`,
    `- Overclaim: ${review.scoresByCategory.overclaim}/100`,
    `- Dignity: ${review.scoresByCategory.dignity}/100`,
    `- Scope: ${review.scoresByCategory.scope}/100`,
    `- Average: ${review.scoreTotal.toFixed(1)}/100`,
  ].join("\n");

  return `
以下の記事がレビューで不合格となりました。フィードバックを基に修正してください。

## 現在の記事

タイトル: ${article.title}

要約: ${article.summary}

本文:
${blocksText}

## レビュー結果（試行 ${attemptNumber}/3）

${feedbackText}

## 修正指示

1. Hard Fail違反がある場合は必ず修正してください
2. スコアが低いカテゴリに注目して改善してください
3. 改善提案に従ってください
4. FACTブロックには必ず evidence_urls を含めてください
5. 政治的評価語、断罪表現、煽動表現を避けてください

## テンプレート
以下のJSON形式で記事を出力してください:
${JSON.stringify(template, null, 2)}

JSON形式で出力してください:
`.trim();
}

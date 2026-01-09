/**
 * Generate Article - Create article from raw item using writer prompt
 */

import { callLLM } from "@/lib/llm/client";
import { getActivePrompt, getActiveTemplate } from "./get-active-prompts";
import { parseArticleBlocks } from "./validate-blocks";
import type { RawItemData, GeneratedArticle } from "./types";

/**
 * Generate article from raw item
 */
export async function generateArticle(
  rawItem: RawItemData
): Promise<GeneratedArticle> {
  // Get active writer prompt and template
  const writerPrompt = await getActivePrompt("DRAFT");
  if (!writerPrompt) {
    throw new Error("No active writer prompt found");
  }

  const template = await getActiveTemplate();
  if (!template) {
    throw new Error("No active article template found");
  }

  // Build prompt for LLM
  const userPrompt = buildPrompt(rawItem, template);

  // Call LLM
  const response = await callLLM("DRAFT", userPrompt, writerPrompt);

  // Parse JSON response
  let parsedResponse: any;
  try {
    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response.content;
    parsedResponse = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${(error as Error).message}`
    );
  }

  // Extract title (from template's title field or first headline)
  const title = extractTitle(parsedResponse);

  // Extract summary (from template's summary field or first 3 points)
  const summary = extractSummary(parsedResponse);

  // Parse blocks from JSON
  const blocks = parseArticleBlocks(parsedResponse);

  return {
    title,
    summary,
    blocks,
  };
}

function buildPrompt(rawItem: RawItemData, template: any): string {
  return `
以下の情報源から記事を作成してください。

## 情報源
タイトル: ${rawItem.title || "（タイトルなし）"}
URL: ${rawItem.url}
公開日: ${rawItem.publishedAt ? rawItem.publishedAt.toISOString() : "不明"}

本文:
${rawItem.content || "（本文なし）"}

## テンプレート
以下のJSON形式で記事を生成してください:
${JSON.stringify(template, null, 2)}

## 重要な注意事項
- FACTブロックには必ず evidence_urls を含めてください（最低1つ）
- 出典がない情報は UNVERIFIED としてください
- 推論や解釈は INFERENCE としてください
- 政治的評価語、断罪表現、煽動表現は使用しないでください
- 中立的で事実ベースの表現を心がけてください

JSON形式で出力してください:
`.trim();
}

function extractTitle(parsedResponse: any): string {
  // Try to extract title from response
  if (parsedResponse.title) {
    return parsedResponse.title;
  }

  // Fallback: use first headline point
  if (
    parsedResponse.headline_3points &&
    Array.isArray(parsedResponse.headline_3points) &&
    parsedResponse.headline_3points.length > 0
  ) {
    return parsedResponse.headline_3points[0];
  }

  // Fallback: generic title
  return "Untitled Article";
}

function extractSummary(parsedResponse: any): string {
  // Try to extract summary from response
  if (parsedResponse.summary) {
    return parsedResponse.summary;
  }

  // Fallback: combine first 3 headline points
  if (
    parsedResponse.headline_3points &&
    Array.isArray(parsedResponse.headline_3points)
  ) {
    return parsedResponse.headline_3points.slice(0, 3).join(" / ");
  }

  return "";
}

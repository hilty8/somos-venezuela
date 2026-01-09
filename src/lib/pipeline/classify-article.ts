/**
 * Classify Article - Categorize article content
 */

import { callLLM } from "@/lib/llm/client";
import { getActivePrompt } from "./get-active-prompts";
import type { GeneratedArticle, ClassificationResult } from "./types";

/**
 * Classify article into category
 */
export async function classifyArticle(
  article: GeneratedArticle
): Promise<ClassificationResult> {
  // Get active classify prompt
  const classifyPrompt = await getActivePrompt("CLASSIFY");
  if (!classifyPrompt) {
    throw new Error("No active classify prompt found");
  }

  // Build prompt
  const userPrompt = `
以下の記事を分類してください。

## タイトル
${article.title}

## 要約
${article.summary}

## 本文（最初の3ブロック）
${article.blocks
  .slice(0, 3)
  .map((b) => b.content)
  .join("\n\n")}

カテゴリ候補: humanitarian, refugee, health, education, food, general

JSON形式で出力してください:
{
  "category": "カテゴリ名",
  "confidence": 0.0〜1.0,
  "reasoning": "理由（省略可）"
}
`.trim();

  // Call LLM
  const response = await callLLM("CLASSIFY", userPrompt, classifyPrompt);

  // Parse JSON response
  try {
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response.content;
    const parsed = JSON.parse(jsonText);

    return {
      category: parsed.category || "general",
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    // Fallback: default category
    return {
      category: "general",
      confidence: 0.3,
      reasoning: "Failed to parse classification response",
    };
  }
}

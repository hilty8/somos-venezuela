/**
 * Review Article - Check quality and compliance
 */

import { callLLM } from "@/lib/llm/client";
import { getActivePrompt } from "./get-active-prompts";
import { checkHardFailRules, checkFactEvidence } from "./hard-fail-rules";
import type { GeneratedArticle, ReviewResult } from "./types";

const REVIEW_PASS_SCORE_MIN = parseFloat(
  process.env.REVIEW_PASS_SCORE_MIN || "70"
);
const REVIEW_PASS_SCORE_AVG = parseFloat(
  process.env.REVIEW_PASS_SCORE_AVG || "80"
);

/**
 * Review article for quality and compliance
 */
export async function reviewArticle(
  article: GeneratedArticle
): Promise<ReviewResult> {
  const hardFailReasons: string[] = [];

  // Step 1: Check Hard Fail Rules
  const philosophyCheck = checkHardFailRules(article.title, article.blocks);
  if (!philosophyCheck.passed) {
    hardFailReasons.push(...philosophyCheck.reasons);
  }

  const evidenceCheck = checkFactEvidence(article.blocks);
  if (!evidenceCheck.passed) {
    hardFailReasons.push(...evidenceCheck.reasons);
  }

  // If hard fail rules violated, return immediately
  if (hardFailReasons.length > 0) {
    return {
      passed: false,
      scoreTotal: 0,
      scoresByCategory: {
        evidence: 0,
        neutrality: 0,
        overclaim: 0,
        dignity: 0,
        scope: 0,
      },
      feedback:
        "記事がHard Failルールに違反しています。上記の問題を修正してください。",
      hardFailReasons,
      suggestions: hardFailReasons,
    };
  }

  // Step 2: LLM Review
  const llmReview = await performLLMReview(article);

  // Step 3: Check if scores meet threshold
  const scores = llmReview.scoresByCategory;
  const scoreValues = Object.values(scores);
  const avgScore = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
  const minScore = Math.min(...scoreValues);

  const passed =
    minScore >= REVIEW_PASS_SCORE_MIN && avgScore >= REVIEW_PASS_SCORE_AVG;

  return {
    passed,
    scoreTotal: avgScore,
    scoresByCategory: scores,
    feedback: llmReview.feedback,
    hardFailReasons: [],
    suggestions: llmReview.suggestions,
  };
}

async function performLLMReview(
  article: GeneratedArticle
): Promise<{
  scoresByCategory: ReviewResult["scoresByCategory"];
  feedback: string;
  suggestions: string[];
}> {
  // Get active reviewer prompt
  const reviewerPrompt = await getActivePrompt("REVIEW");
  if (!reviewerPrompt) {
    throw new Error("No active reviewer prompt found");
  }

  // Build prompt
  const userPrompt = buildReviewPrompt(article);

  // Call LLM
  const response = await callLLM("REVIEW", userPrompt, reviewerPrompt);

  // Parse JSON response
  try {
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response.content;
    const parsed = JSON.parse(jsonText);

    return {
      scoresByCategory: {
        evidence: parsed.scores?.evidence || 50,
        neutrality: parsed.scores?.neutrality || 50,
        overclaim: parsed.scores?.overclaim || 50,
        dignity: parsed.scores?.dignity || 50,
        scope: parsed.scores?.scope || 50,
      },
      feedback: parsed.feedback || "No feedback provided",
      suggestions: parsed.failReasons || parsed.suggestions || [],
    };
  } catch (error) {
    throw new Error(
      `Failed to parse review response: ${(error as Error).message}`
    );
  }
}

function buildReviewPrompt(article: GeneratedArticle): string {
  const blocksText = article.blocks
    .map(
      (b, i) =>
        `[Block ${i + 1} - ${b.type}]\n${b.content}\nEvidence: ${b.evidenceUrls.join(", ") || "なし"}`
    )
    .join("\n\n");

  return `
以下の記事をレビューしてください。

## タイトル
${article.title}

## 要約
${article.summary}

## 本文ブロック
${blocksText}

JSON形式で出力してください:
{
  "passed": true | false,
  "scores": {
    "evidence": 0-100,
    "neutrality": 0-100,
    "overclaim": 0-100,
    "dignity": 0-100,
    "scope": 0-100
  },
  "feedback": "総評",
  "failReasons": ["問題点1", "問題点2", ...],
  "suggestions": ["改善案1", "改善案2", ...]
}
`.trim();
}

/**
 * Block Validation - Ensures FACT blocks have evidence URLs
 *
 * If a FACT block has no evidence URLs, it is automatically
 * converted to UNVERIFIED.
 */

import type { ArticleBlockData } from "./types";

export interface ValidationResult {
  blocks: ArticleBlockData[];
  changedCount: number;
  warnings: string[];
}

/**
 * Validate article blocks and convert FACT without evidence to UNVERIFIED
 */
export function validateBlocks(
  blocks: ArticleBlockData[]
): ValidationResult {
  const validatedBlocks: ArticleBlockData[] = [];
  const warnings: string[] = [];
  let changedCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.type === "FACT") {
      // FACT blocks must have at least one evidence URL
      if (!block.evidenceUrls || block.evidenceUrls.length === 0) {
        warnings.push(
          `Block #${i + 1} labeled as FACT but has no evidence URLs - converted to UNVERIFIED`
        );
        validatedBlocks.push({
          ...block,
          type: "UNVERIFIED",
        });
        changedCount++;
        continue;
      }

      // Validate evidence URLs format
      const validUrls = block.evidenceUrls.filter((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          warnings.push(
            `Block #${i + 1} has invalid URL: "${url}" - removed`
          );
          return false;
        }
      });

      if (validUrls.length === 0) {
        warnings.push(
          `Block #${i + 1} labeled as FACT but all evidence URLs are invalid - converted to UNVERIFIED`
        );
        validatedBlocks.push({
          ...block,
          type: "UNVERIFIED",
          evidenceUrls: [],
        });
        changedCount++;
        continue;
      }

      // Valid FACT block
      validatedBlocks.push({
        ...block,
        evidenceUrls: validUrls,
      });
    } else {
      // INFERENCE or UNVERIFIED blocks don't require evidence
      validatedBlocks.push(block);
    }
  }

  return {
    blocks: validatedBlocks,
    changedCount,
    warnings,
  };
}

/**
 * Parse LLM response to extract article blocks
 * Expected format:
 * ```json
 * {
 *   "headline_3points": ["point1", "point2", "point3"],
 *   "impact_life": { "text": "...", "label": "FACT|INFERENCE|UNVERIFIED", "evidence": [...] },
 *   ...
 * }
 * ```
 */
export function parseArticleBlocks(jsonResponse: any): ArticleBlockData[] {
  const blocks: ArticleBlockData[] = [];
  let order = 0;

  // Parse each section from template
  const sections = [
    "headline_3points",
    "impact_life",
    "numbers",
    "unknowns",
    "support",
  ];

  for (const section of sections) {
    const sectionData = jsonResponse[section];
    if (!sectionData) continue;

    if (section === "headline_3points" && Array.isArray(sectionData)) {
      // headline_3points is an array of strings
      for (const point of sectionData) {
        blocks.push({
          type: "INFERENCE", // Headlines are typically INFERENCE
          content: point,
          evidenceUrls: [],
          order: order++,
        });
      }
    } else if (typeof sectionData === "object") {
      // Other sections have { text, label, evidence? }
      const text = sectionData.text || sectionData.content || "";
      const label = sectionData.label || "UNVERIFIED";
      const evidence = sectionData.evidence || sectionData.evidenceUrls || [];

      blocks.push({
        type: label as "FACT" | "INFERENCE" | "UNVERIFIED",
        content: text,
        evidenceUrls: Array.isArray(evidence) ? evidence : [],
        order: order++,
      });
    }
  }

  return blocks;
}

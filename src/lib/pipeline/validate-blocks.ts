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

export interface ValidationContext {
  rawItemUrl: string;
  sourceUrl: string;
}

const MAX_EVIDENCE_URLS = 5;

/**
 * Validate article blocks and convert FACT without evidence to UNVERIFIED
 */
export function validateBlocks(
  blocks: ArticleBlockData[],
  context?: ValidationContext
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

      // Enhance evidence URLs with context-aware validation
      let processedUrls = [...block.evidenceUrls];

      // 1. Ensure raw_item.url is included (priority rule)
      if (context && context.rawItemUrl) {
        if (!processedUrls.includes(context.rawItemUrl)) {
          processedUrls.unshift(context.rawItemUrl); // Add to front
          warnings.push(
            `Block #${i + 1}: Added raw_item.url as primary evidence source`
          );
        }
      }

      // 2. Validate URL format and filter invalid URLs
      const validUrls = processedUrls.filter((url) => {
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

      // 3. Deduplicate evidence URLs
      const uniqueUrls = Array.from(new Set(validUrls));
      if (uniqueUrls.length < validUrls.length) {
        warnings.push(
          `Block #${i + 1}: Removed ${validUrls.length - uniqueUrls.length} duplicate URL(s)`
        );
      }

      // 4. Limit to MAX_EVIDENCE_URLS
      let finalUrls = uniqueUrls;
      if (uniqueUrls.length > MAX_EVIDENCE_URLS) {
        finalUrls = uniqueUrls.slice(0, MAX_EVIDENCE_URLS);
        warnings.push(
          `Block #${i + 1}: Limited evidence URLs to ${MAX_EVIDENCE_URLS} (had ${uniqueUrls.length})`
        );
      }

      // 5. Domain validation (sources whitelist check)
      if (context && context.sourceUrl) {
        const sourceDomain = extractDomain(context.sourceUrl);
        const untrustedUrls = finalUrls.filter((url) => {
          const urlDomain = extractDomain(url);
          return urlDomain !== sourceDomain;
        });

        if (untrustedUrls.length > 0 && untrustedUrls.length === finalUrls.length) {
          // All URLs are from untrusted domains -> convert to UNVERIFIED
          warnings.push(
            `Block #${i + 1}: All evidence URLs are from untrusted domains (not ${sourceDomain}) - converted to UNVERIFIED`
          );
          validatedBlocks.push({
            ...block,
            type: "UNVERIFIED",
            evidenceUrls: finalUrls,
          });
          changedCount++;
          continue;
        } else if (untrustedUrls.length > 0) {
          // Some URLs are untrusted -> warning only
          warnings.push(
            `Block #${i + 1}: ${untrustedUrls.length} evidence URL(s) from untrusted domains`
          );
        }
      }

      if (finalUrls.length === 0) {
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
        evidenceUrls: finalUrls,
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

/**
 * Extract domain from URL for comparison
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

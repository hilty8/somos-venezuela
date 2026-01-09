/**
 * Tests for block validation logic
 */

import { describe, it, expect } from "vitest";
import { validateBlocks } from "../validate-blocks";
import type { ArticleBlockData } from "../types";

describe("validateBlocks", () => {
  it("should convert FACT blocks without evidence URLs to UNVERIFIED", () => {
    const blocks: ArticleBlockData[] = [
      {
        type: "FACT",
        content: "This is a fact without evidence",
        evidenceUrls: [],
        order: 0,
      },
      {
        type: "FACT",
        content: "This is a fact with evidence",
        evidenceUrls: ["https://example.com/source"],
        order: 1,
      },
    ];

    const result = validateBlocks(blocks);

    expect(result.blocks[0].type).toBe("UNVERIFIED");
    expect(result.blocks[1].type).toBe("FACT");
    expect(result.changedCount).toBe(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should convert FACT blocks with invalid URLs to UNVERIFIED", () => {
    const blocks: ArticleBlockData[] = [
      {
        type: "FACT",
        content: "This is a fact with invalid URL",
        evidenceUrls: ["not-a-valid-url"],
        order: 0,
      },
    ];

    const result = validateBlocks(blocks);

    expect(result.blocks[0].type).toBe("UNVERIFIED");
    expect(result.changedCount).toBe(1);
  });

  it("should keep FACT blocks with valid evidence URLs", () => {
    const blocks: ArticleBlockData[] = [
      {
        type: "FACT",
        content: "This is a valid fact",
        evidenceUrls: [
          "https://www.unhcr.org/news",
          "https://www.un.org/report",
        ],
        order: 0,
      },
    ];

    const result = validateBlocks(blocks);

    expect(result.blocks[0].type).toBe("FACT");
    expect(result.blocks[0].evidenceUrls).toHaveLength(2);
    expect(result.changedCount).toBe(0);
  });

  it("should not modify INFERENCE or UNVERIFIED blocks", () => {
    const blocks: ArticleBlockData[] = [
      {
        type: "INFERENCE",
        content: "This is an inference",
        evidenceUrls: [],
        order: 0,
      },
      {
        type: "UNVERIFIED",
        content: "This is unverified",
        evidenceUrls: [],
        order: 1,
      },
    ];

    const result = validateBlocks(blocks);

    expect(result.blocks[0].type).toBe("INFERENCE");
    expect(result.blocks[1].type).toBe("UNVERIFIED");
    expect(result.changedCount).toBe(0);
  });

  it("should filter out invalid URLs from FACT blocks", () => {
    const blocks: ArticleBlockData[] = [
      {
        type: "FACT",
        content: "Fact with mixed URLs",
        evidenceUrls: [
          "https://valid.com",
          "invalid-url",
          "https://another-valid.com",
        ],
        order: 0,
      },
    ];

    const result = validateBlocks(blocks);

    expect(result.blocks[0].type).toBe("FACT");
    expect(result.blocks[0].evidenceUrls).toHaveLength(2);
    expect(result.blocks[0].evidenceUrls).toEqual([
      "https://valid.com",
      "https://another-valid.com",
    ]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

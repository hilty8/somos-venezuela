/**
 * JSON Repair Tests
 *
 * Tests for JSON repair logic in article generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("JSON Repair Logic", () => {
  describe("generateArticle with JSON repair", () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
    });

    it("should successfully parse valid JSON without repair", async () => {
      // Mock LLM response with valid JSON
      const validJSON = {
        title: "Test Article",
        headline_3points: ["Point 1", "Point 2", "Point 3"],
        blocks: [
          {
            type: "FACT",
            content: "Test content",
            evidence_urls: ["https://example.com"],
          },
        ],
      };

      // Mock callLLM to return valid JSON
      vi.doMock("@/lib/llm/client", () => ({
        callLLM: vi.fn().mockResolvedValue({
          content: `\`\`\`json\n${JSON.stringify(validJSON, null, 2)}\n\`\`\``,
        }),
      }));

      // Mock database queries
      vi.doMock("@/lib/db", () => ({
        db: {
          promptVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "prompt1",
              type: "DRAFT",
              content: "Test prompt",
            }),
          },
          templateVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "template1",
              content: validJSON,
            }),
          },
        },
      }));

      const { generateArticle } = await import("../generate-article");

      const result = await generateArticle({
        id: "raw1",
        sourceId: "source1",
        url: "https://example.com/article",
        title: "Test",
        content: "Test content",
        publishedAt: new Date(),
      });

      expect(result.title).toBe("Test Article");
      expect(result.blocks).toHaveLength(1);
    });

    it("should attempt JSON repair when initial parse fails", async () => {
      let callCount = 0;
      const validJSON = {
        title: "Test Article",
        headline_3points: ["Point 1"],
        blocks: [
          {
            type: "FACT",
            content: "Test",
            evidence_urls: ["https://example.com"],
          },
        ],
      };

      // Mock callLLM: first returns invalid JSON, second returns repaired JSON
      vi.doMock("@/lib/llm/client", () => ({
        callLLM: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call: return invalid JSON (missing closing brace)
            return Promise.resolve({
              content: '{"title": "Test Article", "blocks": [',
            });
          } else {
            // Second call (repair): return valid JSON
            return Promise.resolve({
              content: JSON.stringify(validJSON),
            });
          }
        }),
      }));

      // Mock database
      vi.doMock("@/lib/db", () => ({
        db: {
          promptVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "prompt1",
              type: "DRAFT",
              content: "Test prompt",
            }),
          },
          templateVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "template1",
              content: {},
            }),
          },
        },
      }));

      const { generateArticle } = await import("../generate-article");

      const result = await generateArticle({
        id: "raw1",
        sourceId: "source1",
        url: "https://example.com/article",
        title: "Test",
        content: "Test content",
        publishedAt: new Date(),
      });

      expect(result.title).toBe("Test Article");
      expect(callCount).toBe(2); // Initial call + repair call
    });

    it("should throw INVALID_JSON error when repair also fails", async () => {
      let callCount = 0;

      // Mock callLLM: both calls return invalid JSON
      vi.doMock("@/lib/llm/client", () => ({
        callLLM: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            content: '{"invalid": "json"', // Missing closing brace
          });
        }),
      }));

      // Mock database
      vi.doMock("@/lib/db", () => ({
        db: {
          promptVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "prompt1",
              type: "DRAFT",
              content: "Test prompt",
            }),
          },
          templateVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "template1",
              content: {},
            }),
          },
        },
      }));

      const { generateArticle } = await import("../generate-article");

      await expect(
        generateArticle({
          id: "raw1",
          sourceId: "source1",
          url: "https://example.com/article",
          title: "Test",
          content: "Test content",
          publishedAt: new Date(),
        })
      ).rejects.toThrow("INVALID_JSON");

      expect(callCount).toBe(2); // Initial call + repair attempt
    });
  });

  describe("Error message format", () => {
    it("should include INVALID_JSON prefix in error message", async () => {
      // Mock callLLM to always return invalid JSON
      vi.doMock("@/lib/llm/client", () => ({
        callLLM: vi.fn().mockResolvedValue({
          content: "not json at all",
        }),
      }));

      // Mock database
      vi.doMock("@/lib/db", () => ({
        db: {
          promptVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "prompt1",
              type: "DRAFT",
              content: "Test prompt",
            }),
          },
          templateVersion: {
            findFirst: vi.fn().mockResolvedValue({
              id: "template1",
              content: {},
            }),
          },
        },
      }));

      const { generateArticle } = await import("../generate-article");

      try {
        await generateArticle({
          id: "raw1",
          sourceId: "source1",
          url: "https://example.com/article",
          title: "Test",
          content: "Test content",
          publishedAt: new Date(),
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect((error as Error).message).toContain("INVALID_JSON:");
        expect((error as Error).message).toContain("Original error:");
        expect((error as Error).message).toContain("Repair error:");
      }
    });
  });
});

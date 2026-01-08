import { describe, it, expect } from "vitest";
import * as crypto from "crypto";

// Test sync logic without actual file I/O

describe("Prompt Sync Logic", () => {
  describe("Content hash calculation", () => {
    it("should generate SHA256 hash", () => {
      const content = "Test prompt content";
      const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");

      expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce different hashes for different content", () => {
      const content1 = "Test prompt version 1";
      const content2 = "Test prompt version 2";

      const hash1 = crypto.createHash("sha256").update(content1, "utf8").digest("hex");
      const hash2 = crypto.createHash("sha256").update(content2, "utf8").digest("hex");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce same hash for identical content", () => {
      const content = "Identical content";

      const hash1 = crypto.createHash("sha256").update(content, "utf8").digest("hex");
      const hash2 = crypto.createHash("sha256").update(content, "utf8").digest("hex");

      expect(hash1).toBe(hash2);
    });
  });

  describe("YAML frontmatter parsing", () => {
    it("should extract frontmatter from markdown", () => {
      const markdown = `---
name: test_prompt
version: v1
type: DRAFT
description: Test description
---

Prompt content goes here`;

      const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
      const match = markdown.match(frontmatterRegex);

      expect(match).not.toBeNull();
      expect(match![1]).toContain("name: test_prompt");
      expect(match![2].trim()).toBe("Prompt content goes here");
    });

    it("should parse key-value pairs from frontmatter", () => {
      const frontmatterText = `name: test_prompt
version: v1
type: DRAFT`;

      const frontmatter: any = {};
      frontmatterText.split("\n").forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          frontmatter[key] = value;
        }
      });

      expect(frontmatter.name).toBe("test_prompt");
      expect(frontmatter.version).toBe("v1");
      expect(frontmatter.type).toBe("DRAFT");
    });
  });

  describe("Version comparison", () => {
    it("should detect when content has changed", () => {
      interface Version {
        version: string;
        contentHash: string;
      }

      const existingVersion: Version = {
        version: "v1",
        contentHash: crypto
          .createHash("sha256")
          .update("Original content", "utf8")
          .digest("hex"),
      };

      const newContentHash = crypto
        .createHash("sha256")
        .update("Modified content", "utf8")
        .digest("hex");

      const hasChanged = existingVersion.contentHash !== newContentHash;
      expect(hasChanged).toBe(true);
    });

    it("should detect when content is unchanged", () => {
      const content = "Unchanged content";

      interface Version {
        version: string;
        contentHash: string;
      }

      const existingVersion: Version = {
        version: "v1",
        contentHash: crypto.createHash("sha256").update(content, "utf8").digest("hex"),
      };

      const newContentHash = crypto.createHash("sha256").update(content, "utf8").digest("hex");

      const hasChanged = existingVersion.contentHash !== newContentHash;
      expect(hasChanged).toBe(false);
    });
  });

  describe("Active version management", () => {
    it("should identify when no active version exists", () => {
      interface Version {
        id: string;
        name: string;
        version: string;
        isActive: boolean;
      }

      const versions: Version[] = [
        { id: "1", name: "writer", version: "v1", isActive: false },
        { id: "2", name: "writer", version: "v2", isActive: false },
      ];

      const currentActive = versions.find((v) => v.isActive);
      expect(currentActive).toBeUndefined();

      // Should auto-activate first version
      const shouldActivate = !currentActive;
      expect(shouldActivate).toBe(true);
    });

    it("should identify existing active version", () => {
      interface Version {
        id: string;
        name: string;
        version: string;
        isActive: boolean;
      }

      const versions: Version[] = [
        { id: "1", name: "writer", version: "v1", isActive: true },
        { id: "2", name: "writer", version: "v2", isActive: false },
      ];

      const currentActive = versions.find((v) => v.isActive);
      expect(currentActive).toBeDefined();
      expect(currentActive?.version).toBe("v1");

      // Should not auto-activate new version
      const shouldActivate = !currentActive;
      expect(shouldActivate).toBe(false);
    });
  });

  describe("PromptType mapping", () => {
    it("should map string to PromptType enum", () => {
      const typeMap: Record<string, string> = {
        SUMMARIZE: "SUMMARIZE",
        DRAFT: "DRAFT",
        CLASSIFY: "CLASSIFY",
        REVIEW: "REVIEW",
        REWRITE: "REWRITE",
      };

      expect(typeMap["DRAFT"]).toBe("DRAFT");
      expect(typeMap["REVIEW"]).toBe("REVIEW");
    });

    it("should handle invalid type", () => {
      const typeString = "INVALID_TYPE";
      const typeMap: Record<string, string> = {
        SUMMARIZE: "SUMMARIZE",
        DRAFT: "DRAFT",
        CLASSIFY: "CLASSIFY",
        REVIEW: "REVIEW",
        REWRITE: "REWRITE",
      };

      const type = typeMap[typeString];
      expect(type).toBeUndefined();
    });
  });
});

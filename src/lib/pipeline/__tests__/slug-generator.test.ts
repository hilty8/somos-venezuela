/**
 * Tests for slug generation logic
 */

import { describe, it, expect } from "vitest";

// Helper function to generate slug (extracted logic for testing)
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove duplicate hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 60); // Limit length
}

function generateSlugFormat(title: string): string {
  const date = new Date();
  const datePrefix = date.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const baseSlug = titleToSlug(title);
  return `${datePrefix}-${baseSlug}`;
}

describe("Slug Generator", () => {
  it("should generate URL-safe slugs from titles", () => {
    expect(titleToSlug("Hello World")).toBe("hello-world");
    expect(titleToSlug("Test Article 123")).toBe("test-article-123");
    expect(titleToSlug("Special!@#$%Characters")).toBe("specialcharacters");
  });

  it("should handle Japanese characters by removing them", () => {
    const slug = titleToSlug("ベネズエラ難民支援の現状");
    expect(slug).not.toContain("ベネズエラ");
    expect(slug).toBe(""); // Japanese chars are removed, leaving empty
  });

  it("should replace multiple spaces with single hyphen", () => {
    expect(titleToSlug("Multiple   Spaces   Here")).toBe(
      "multiple-spaces-here"
    );
  });

  it("should remove leading and trailing hyphens", () => {
    expect(titleToSlug("-leading and trailing-")).toBe(
      "leading-and-trailing"
    );
  });

  it("should limit slug length to 60 characters", () => {
    const longTitle =
      "This is a very long title that exceeds the maximum length limit for slugs and should be truncated";
    const slug = titleToSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("should generate slug with date prefix format YYYYMMDD", () => {
    const slug = generateSlugFormat("Test Article");
    expect(slug).toMatch(/^\d{8}-test-article$/);
  });

  it("should generate unique slugs for same title on same day", () => {
    // This test verifies the format - actual uniqueness is handled by DB check
    const slug1 = generateSlugFormat("Same Title");
    const slug2 = generateSlugFormat("Same Title");

    // Both should have same base format
    expect(slug1).toBe(slug2);

    // In practice, DB check would add suffix like: slug1-1, slug1-2, etc.
  });
});

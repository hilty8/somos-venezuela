/**
 * Slug Generator - Creates unique slugs for articles
 */

import { db } from "@/lib/db";

/**
 * Generate a URL-safe slug from a title
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove duplicate hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 60); // Limit length
}

/**
 * Generate a unique slug with date prefix
 * Format: YYYYMMDD-title-suffix
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const date = new Date();
  const datePrefix = date.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD

  const baseSlug = titleToSlug(title);
  let slug = `${datePrefix}-${baseSlug}`;

  // Check if slug already exists
  const existing = await db.article.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existing) {
    return slug;
  }

  // If slug exists, add numeric suffix
  let suffix = 1;
  while (suffix < 100) {
    const candidateSlug = `${slug}-${suffix}`;
    const existingSuffixed = await db.article.findUnique({
      where: { slug: candidateSlug },
      select: { id: true },
    });

    if (!existingSuffixed) {
      return candidateSlug;
    }
    suffix++;
  }

  // Fallback: use random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${slug}-${randomSuffix}`;
}

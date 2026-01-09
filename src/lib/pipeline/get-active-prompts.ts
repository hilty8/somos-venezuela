/**
 * Get Active Prompts and Templates
 * Fetches active versions from DB (Prompt as Code)
 */

import { db } from "@/lib/db";

export async function getActivePrompt(
  type: "SUMMARIZE" | "DRAFT" | "CLASSIFY" | "REVIEW" | "REWRITE"
): Promise<string | null> {
  const activeVersion = await db.promptVersion.findFirst({
    where: {
      type,
      isActive: true,
    },
    select: {
      content: true,
    },
  });

  return activeVersion?.content || null;
}

export async function getActiveTemplate(
  name: string = "article_template_v1"
): Promise<any | null> {
  const activeVersion = await db.templateVersion.findFirst({
    where: {
      name,
      isActive: true,
    },
    select: {
      content: true,
    },
  });

  return activeVersion?.content || null;
}

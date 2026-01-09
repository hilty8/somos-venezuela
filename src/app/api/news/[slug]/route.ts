/**
 * GET /api/news/[slug]
 * Get article by slug
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const article = await db.article.findUnique({
      where: {
        slug,
        status: "PUBLISHED", // Only return published articles
      },
      include: {
        blocks: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      category: article.category,
      publishedAt: article.publishedAt?.toISOString() || null,
      blocks: article.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        evidenceUrls: block.sources, // sources field contains evidence URLs
        order: block.order,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

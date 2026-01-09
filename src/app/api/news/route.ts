/**
 * GET /api/news
 * Get published articles
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const category = searchParams.get("category");

    const where: any = { status: "PUBLISHED" };
    if (category) {
      where.category = category;
    }

    const articles = await db.article.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        category: true,
        publishedAt: true,
        _count: {
          select: {
            blocks: true,
          },
        },
      },
    });

    const total = await db.article.count({ where });

    return NextResponse.json({
      articles: articles.map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        category: article.category,
        publishedAt: article.publishedAt?.toISOString() || null,
        blockCount: article._count.blocks,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

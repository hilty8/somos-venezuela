/**
 * GET /api/admin/ops/hold
 * Get hold articles (review failed)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const holdArticles = await db.article.findMany({
      where: {
        status: "HOLD",
      },
      include: {
        reviewRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get associated raw items
    const rawItemIds = holdArticles.flatMap((article) => article.rawItemIds);
    const rawItems = await db.rawItem.findMany({
      where: {
        id: {
          in: rawItemIds,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const rawItemStatusMap = rawItems.reduce((acc, item) => {
      acc[item.id] = item.status;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({
      articles: holdArticles.map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        category: article.category,
        createdAt: article.createdAt.toISOString(),
        rawItemStatus: article.rawItemIds.map(
          (id) => rawItemStatusMap[id] || "UNKNOWN"
        ),
        lastReview: article.reviewRuns[0]
          ? {
              scoreTotal: article.reviewRuns[0].scoreTotal,
              hardFailReasons: article.reviewRuns[0].hardFailReasons,
              suggestions: article.reviewRuns[0].suggestions,
              attemptNumber: article.reviewRuns[0].attemptNumber,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch hold articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch hold articles" },
      { status: 500 }
    );
  }
}

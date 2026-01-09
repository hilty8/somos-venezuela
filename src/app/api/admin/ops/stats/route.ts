/**
 * GET /api/admin/ops/stats
 * Get operational statistics
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
    // Raw items stats
    const rawItemsStats = await db.rawItem.groupBy({
      by: ["status"],
      _count: true,
    });

    const rawItemsByStatus = rawItemsStats.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Article stats
    const articlesStats = await db.article.groupBy({
      by: ["status"],
      _count: true,
    });

    const articlesByStatus = articlesStats.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Today's pipeline runs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRuns = await db.pipelineRun.findMany({
      where: {
        startedAt: {
          gte: today,
        },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    // Stale PROCESSING items
    const staleMinutes = parseInt(
      process.env.PIPELINE_STALE_PROCESSING_MINUTES || "120",
      10
    );
    const staleThreshold = new Date();
    staleThreshold.setMinutes(staleThreshold.getMinutes() - staleMinutes);

    const staleProcessing = await db.rawItem.count({
      where: {
        status: "PROCESSING",
        processingStartedAt: {
          lt: staleThreshold,
        },
      },
    });

    // Retryable FAILED items
    const maxRetry = parseInt(
      process.env.PIPELINE_MAX_RETRY_PER_ITEM || "2",
      10
    );

    const retryableFailed = await db.rawItem.count({
      where: {
        status: "FAILED",
        retryCount: {
          lt: maxRetry,
        },
      },
    });

    return NextResponse.json({
      rawItems: rawItemsByStatus,
      articles: articlesByStatus,
      todayRuns: todayRuns.map((run) => ({
        id: run.id,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() || null,
        stats: run.stats,
      })),
      staleProcessing,
      retryableFailed,
    });
  } catch (error) {
    console.error("Failed to fetch ops stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch operational statistics" },
      { status: 500 }
    );
  }
}

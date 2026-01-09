/**
 * GET /api/admin/ops/failed
 * Get failed raw items
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

    const failedItems = await db.rawItem.findMany({
      where: {
        status: "FAILED",
      },
      include: {
        source: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { lastAttemptAt: "desc" },
      take: limit,
    });

    const maxRetry = parseInt(
      process.env.PIPELINE_MAX_RETRY_PER_ITEM || "2",
      10
    );

    return NextResponse.json({
      items: failedItems.map((item) => ({
        id: item.id,
        url: item.url,
        title: item.title,
        source: item.source,
        errorReason: item.errorReason,
        retryCount: item.retryCount,
        lastAttemptAt: item.lastAttemptAt?.toISOString() || null,
        canRetry: item.retryCount < maxRetry,
      })),
      maxRetry,
    });
  } catch (error) {
    console.error("Failed to fetch failed items:", error);
    return NextResponse.json(
      { error: "Failed to fetch failed items" },
      { status: 500 }
    );
  }
}

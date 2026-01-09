/**
 * GET /api/admin/pipeline/runs
 * Get all pipeline runs
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
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const runs = await db.pipelineRun.findMany({
      take: limit,
      skip: offset,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        sourceId: true,
        limit: true,
        stats: true,
      },
    });

    const total = await db.pipelineRun.count();

    return NextResponse.json({
      runs: runs.map((run) => ({
        id: run.id,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() || null,
        sourceId: run.sourceId,
        limit: run.limit,
        stats: run.stats,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch pipeline runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline runs" },
      { status: 500 }
    );
  }
}

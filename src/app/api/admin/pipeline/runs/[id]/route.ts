/**
 * GET /api/admin/pipeline/runs/[id]
 * Get specific pipeline run details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    const run = await db.pipelineRun.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Pipeline run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() || null,
      sourceId: run.sourceId,
      limit: run.limit,
      stats: run.stats,
      logs: run.logs,
    });
  } catch (error) {
    console.error("Failed to fetch pipeline run:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline run" },
      { status: 500 }
    );
  }
}

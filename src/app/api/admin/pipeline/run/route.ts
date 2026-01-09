/**
 * POST /api/admin/pipeline/run
 * Execute article generation pipeline
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline/run-pipeline";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sourceId, limit } = body;

    // Validate inputs
    if (limit && (typeof limit !== "number" || limit < 1 || limit > 1000)) {
      return NextResponse.json(
        { error: "Invalid limit (must be 1-1000)" },
        { status: 400 }
      );
    }

    // Run pipeline
    const result = await runPipeline({
      sourceId: sourceId || undefined,
      limit: limit || undefined,
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: "run",
      entity: "pipeline",
      entityId: result.runId,
      changes: {
        sourceId,
        limit,
        stats: result.stats,
      },
    });

    return NextResponse.json({
      success: true,
      runId: result.runId,
      stats: result.stats,
      logs: result.logs.map((log) => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        rawItemId: log.rawItemId,
        articleId: log.articleId,
      })),
    });
  } catch (error) {
    console.error("Pipeline run error:", error);
    return NextResponse.json(
      {
        error: "Pipeline execution failed",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

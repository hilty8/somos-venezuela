/**
 * POST /api/admin/ops/recover-stale
 * Recover stale PROCESSING items
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action = "NEW" } = body; // "NEW" or "FAILED"

    if (action !== "NEW" && action !== "FAILED") {
      return NextResponse.json(
        { error: "Invalid action. Must be NEW or FAILED" },
        { status: 400 }
      );
    }

    const staleMinutes = parseInt(
      process.env.PIPELINE_STALE_PROCESSING_MINUTES || "120",
      10
    );
    const staleThreshold = new Date();
    staleThreshold.setMinutes(staleThreshold.getMinutes() - staleMinutes);

    // Find stale PROCESSING items
    const staleItems = await db.rawItem.findMany({
      where: {
        status: "PROCESSING",
        processingStartedAt: {
          lt: staleThreshold,
        },
      },
    });

    if (staleItems.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No stale PROCESSING items found",
      });
    }

    // Recover to specified status
    const result = await db.rawItem.updateMany({
      where: {
        id: {
          in: staleItems.map((item) => item.id),
        },
      },
      data: {
        status: action as "NEW" | "FAILED",
        processingStartedAt: null,
        errorReason:
          action === "FAILED"
            ? "Stale PROCESSING recovered by admin"
            : null,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: "recover_stale",
      entity: "raw_item",
      entityId: staleItems.map((item) => item.id).join(","),
      changes: {
        count: result.count,
        targetStatus: action,
        staleMinutes,
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} stale PROCESSING items recovered to ${action}`,
    });
  } catch (error) {
    console.error("Failed to recover stale items:", error);
    return NextResponse.json(
      { error: "Failed to recover stale items" },
      { status: 500 }
    );
  }
}

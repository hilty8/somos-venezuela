/**
 * POST /api/admin/ops/retry-failed
 * Retry failed items (within retry limit)
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
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "itemIds array is required" },
        { status: 400 }
      );
    }

    const maxRetry = parseInt(
      process.env.PIPELINE_MAX_RETRY_PER_ITEM || "2",
      10
    );

    // Get items to verify they can be retried
    const items = await db.rawItem.findMany({
      where: {
        id: {
          in: itemIds,
        },
        status: "FAILED",
        retryCount: {
          lt: maxRetry,
        },
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No retryable items found" },
        { status: 400 }
      );
    }

    // Reset to NEW for retry
    const result = await db.rawItem.updateMany({
      where: {
        id: {
          in: items.map((item) => item.id),
        },
      },
      data: {
        status: "NEW",
        errorReason: null,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: "retry",
      entity: "raw_item",
      entityId: itemIds.join(","),
      changes: {
        count: result.count,
        itemIds: items.map((item) => item.id),
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} items reset to NEW for retry`,
    });
  } catch (error) {
    console.error("Failed to retry items:", error);
    return NextResponse.json(
      { error: "Failed to retry items" },
      { status: 500 }
    );
  }
}

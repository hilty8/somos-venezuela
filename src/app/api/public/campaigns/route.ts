/**
 * GET /api/public/campaigns
 * Get active donation campaigns
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const campaigns = await db.donationCampaign.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        provider: true,
      },
      orderBy: {
        category: "asc",
      },
    });

    return NextResponse.json({
      campaigns,
    });
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

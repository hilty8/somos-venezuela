/**
 * GET /api/public/campaigns/top-priority
 * Get the highest priority active donation campaign for support button
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get the highest priority active campaign
    const campaign = await db.donationCampaign.findFirst({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        provider: true,
        priority: true,
      },
      orderBy: {
        priority: "desc", // Highest priority first
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "No active campaigns found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      campaign,
    });
  } catch (error) {
    console.error("Failed to fetch top priority campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

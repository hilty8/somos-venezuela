/**
 * GET /go/[id]
 * Redirect to donation campaign with click tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get campaign
    const campaign = await db.donationCampaign.findUnique({
      where: { id },
      select: {
        donationUrl: true,
        isActive: true,
      },
    });

    if (!campaign || !campaign.isActive) {
      return NextResponse.json(
        { error: "Campaign not found or inactive" },
        { status: 404 }
      );
    }

    // Track click event
    try {
      await db.clickEvent.create({
        data: {
          campaignId: id,
          userAgent: request.headers.get("user-agent") || undefined,
          referer: request.headers.get("referer") || undefined,
        },
      });
    } catch (error) {
      // Log error but don't fail the redirect
      console.error("Failed to track click event:", error);
    }

    // Redirect to donation URL
    return NextResponse.redirect(campaign.donationUrl, 302);
  } catch (error) {
    console.error("Redirect error:", error);
    return NextResponse.json(
      { error: "Failed to process redirect" },
      { status: 500 }
    );
  }
}

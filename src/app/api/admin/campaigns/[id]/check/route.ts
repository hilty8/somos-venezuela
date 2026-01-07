import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchDonationAmount } from "@/lib/fetch-donation-amount";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const campaign = await db.donationCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await fetchDonationAmount(
      campaign.publicTotalUrl,
      campaign.parseConfig as { selector?: string; regex?: string; currency?: string },
      10000
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        rawValue: result.rawValue,
      });
    }

    // Save snapshot
    await db.donationSnapshot.create({
      data: {
        campaignId: campaign.id,
        amount: result.amount!,
        currency: result.currency || "USD",
        rawValue: result.rawValue,
      },
    });

    // Update campaign
    await db.donationCampaign.update({
      where: { id },
      data: {
        lastFetchAt: new Date(),
        lastError: null,
        errorCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      amount: result.amount,
      currency: result.currency,
      rawValue: result.rawValue,
    });
  } catch (error) {
    console.error("Error checking campaign:", error);
    return NextResponse.json(
      { error: "Failed to check campaign" },
      { status: 500 }
    );
  }
}

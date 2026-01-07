import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get latest snapshots for each campaign
    const campaigns = await db.donationCampaign.findMany({
      where: { isActive: true },
      include: {
        snapshots: {
          orderBy: { fetchedAt: "desc" },
          take: 1,
        },
      },
    });

    // Calculate total KGI
    let totalAmount = 0;
    let lastUpdate: Date | null = null;

    for (const campaign of campaigns) {
      if (campaign.snapshots.length > 0) {
        const snapshot = campaign.snapshots[0];
        totalAmount += Number(snapshot.amount);

        if (!lastUpdate || snapshot.fetchedAt > lastUpdate) {
          lastUpdate = snapshot.fetchedAt;
        }
      }
    }

    return NextResponse.json({
      kgi: {
        total: totalAmount,
        currency: "USD", // TODO: Handle multiple currencies
        lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
      },
      campaignCount: campaigns.length,
    });
  } catch (error) {
    console.error("Error fetching home data:", error);
    return NextResponse.json(
      { error: "Failed to fetch home data" },
      { status: 500 }
    );
  }
}

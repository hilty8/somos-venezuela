import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaign_id: string }> }
) {
  const { campaign_id } = await params;

  try {
    // Find campaign
    const campaign = await db.donationCampaign.findUnique({
      where: { id: campaign_id },
    });

    if (!campaign) {
      return new Response("Campaign not found", { status: 404 });
    }

    // Record click event (async, don't wait)
    const userAgent = request.headers.get("user-agent") || undefined;
    const referer = request.headers.get("referer") || undefined;

    db.clickEvent
      .create({
        data: {
          campaignId: campaign_id,
          userAgent,
          referer,
        },
      })
      .catch((error) => {
        console.error("Failed to record click event:", error);
        // Don't fail the redirect if click recording fails
      });

    // Redirect to donation URL (prefer donationUrl, fallback to publicTotalUrl)
    const targetUrl = campaign.donationUrl || campaign.publicTotalUrl;
    redirect(targetUrl);
  } catch (error) {
    console.error("Error in /go redirect:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

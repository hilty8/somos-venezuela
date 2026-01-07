import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await db.donationCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { snapshots: true },
      },
    },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.publicTotalUrl || !body.donationUrl || !body.parseConfig) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const campaign = await db.donationCampaign.create({
      data: {
        name: body.name,
        description: body.description || null,
        category: body.category || "general",
        provider: body.provider || "Unknown",
        fetchMethod: body.fetchMethod || "PUBLIC_TOTAL_SCRAPE",
        publicTotalUrl: body.publicTotalUrl,
        apiUrl: body.apiUrl || null,
        parseConfig: body.parseConfig,
        donationUrl: body.donationUrl,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "create",
      entity: "donation_campaign",
      entityId: campaign.id,
      changes: { name: campaign.name },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

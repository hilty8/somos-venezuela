import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const campaign = await db.donationCampaign.findUnique({
    where: { id },
    include: {
      snapshots: {
        orderBy: { fetchedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const before = await db.donationCampaign.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const campaign = await db.donationCampaign.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        provider: body.provider,
        fetchMethod: body.fetchMethod,
        publicTotalUrl: body.publicTotalUrl,
        apiUrl: body.apiUrl,
        parseConfig: body.parseConfig,
        donationUrl: body.donationUrl,
        isActive: body.isActive,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "update",
      entity: "donation_campaign",
      entityId: campaign.id,
      changes: {
        before: { name: before.name, isActive: before.isActive },
        after: { name: campaign.name, isActive: campaign.isActive },
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const campaign = await db.donationCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.donationCampaign.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "delete",
      entity: "donation_campaign",
      entityId: id,
      changes: { name: campaign.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await db.source.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { rawItems: true },
      },
    },
  });

  return NextResponse.json(sources);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.url) {
      return NextResponse.json(
        { error: "Missing required fields (name, url)" },
        { status: 400 }
      );
    }

    // Check for duplicate URL
    const existing = await db.source.findUnique({
      where: { url: body.url },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Source with this URL already exists" },
        { status: 409 }
      );
    }

    const source = await db.source.create({
      data: {
        name: body.name,
        url: body.url,
        category: body.category || "humanitarian",
        fetchMethod: body.fetchMethod || "rss",
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "create",
      entity: "source",
      entityId: source.id,
      changes: { name: source.name, url: source.url },
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error("Error creating source:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}

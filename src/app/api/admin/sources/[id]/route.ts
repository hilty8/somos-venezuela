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

  const source = await db.source.findUnique({
    where: { id },
    include: {
      rawItems: {
        orderBy: { fetchedAt: "desc" },
        take: 20,
      },
      _count: {
        select: { rawItems: true },
      },
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(source);
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

    const before = await db.source.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check for URL conflict if URL is being changed
    if (body.url && body.url !== before.url) {
      const existing = await db.source.findUnique({
        where: { url: body.url },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Source with this URL already exists" },
          { status: 409 }
        );
      }
    }

    const source = await db.source.update({
      where: { id },
      data: {
        name: body.name,
        url: body.url,
        category: body.category,
        fetchMethod: body.fetchMethod,
        isActive: body.isActive,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "update",
      entity: "source",
      entityId: source.id,
      changes: {
        before: {
          name: before.name,
          url: before.url,
          isActive: before.isActive,
        },
        after: { name: source.name, url: source.url, isActive: source.isActive },
      },
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error("Error updating source:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
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
    const source = await db.source.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.source.delete({ where: { id } });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "delete",
      entity: "source",
      entityId: id,
      changes: { name: source.name, url: source.url },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting source:", error);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}

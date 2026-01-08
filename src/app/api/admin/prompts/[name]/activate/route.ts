import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const body = await request.json();
  const { versionId } = body;

  if (!versionId) {
    return NextResponse.json(
      { error: "versionId is required" },
      { status: 400 }
    );
  }

  try {
    // Get the target version
    const targetVersion = await db.promptVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion || targetVersion.name !== name) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Deactivate all versions for this prompt name
    await db.promptVersion.updateMany({
      where: { name },
      data: { isActive: false },
    });

    // Activate the target version
    const activatedVersion = await db.promptVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    });

    // Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "activate",
      entity: "prompt_version",
      entityId: versionId,
      changes: {
        name,
        version: activatedVersion.version,
        type: activatedVersion.type,
      },
    });

    return NextResponse.json({
      success: true,
      activatedVersion,
    });
  } catch (error) {
    console.error("Error activating prompt version:", error);
    return NextResponse.json(
      { error: "Failed to activate version" },
      { status: 500 }
    );
  }
}

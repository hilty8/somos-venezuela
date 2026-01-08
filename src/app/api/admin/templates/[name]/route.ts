import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;

  // Get all versions for this template name
  const versions = await db.templateVersion.findMany({
    where: { name },
    orderBy: { createdAt: "desc" },
    include: {
      createdByAdmin: {
        select: { name: true, email: true },
      },
    },
  });

  if (versions.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name,
    versions,
  });
}

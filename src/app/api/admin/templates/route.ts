import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Group templates by name, showing active version
  const allTemplates = await db.templateVersion.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    include: {
      createdByAdmin: {
        select: { name: true, email: true },
      },
    },
  });

  // Group by name
  const grouped: Record<
    string,
    {
      name: string;
      activeVersion: any | null;
      totalVersions: number;
      latestUpdate: Date;
    }
  > = {};

  allTemplates.forEach((template) => {
    const nameKey = template.name;

    if (!grouped[nameKey]) {
      grouped[nameKey] = {
        name: template.name,
        activeVersion: null,
        totalVersions: 0,
        latestUpdate: template.createdAt,
      };
    }

    grouped[nameKey].totalVersions++;

    if (template.isActive) {
      grouped[nameKey].activeVersion = template;
    }

    if (template.createdAt > grouped[nameKey].latestUpdate) {
      grouped[nameKey].latestUpdate = template.createdAt;
    }
  });

  return NextResponse.json(grouped);
}

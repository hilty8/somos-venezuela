import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PromptType } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Group prompts by type and name, showing active version
  const allPrompts = await db.promptVersion.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }, { createdAt: "desc" }],
    include: {
      createdByAdmin: {
        select: { name: true, email: true },
      },
    },
  });

  // Group by type and name
  const grouped: Record<
    string,
    Record<
      string,
      {
        type: PromptType;
        name: string;
        activeVersion: any | null;
        totalVersions: number;
        latestUpdate: Date;
      }
    >
  > = {};

  allPrompts.forEach((prompt) => {
    const typeKey = prompt.type;
    const nameKey = prompt.name;

    if (!grouped[typeKey]) {
      grouped[typeKey] = {};
    }

    if (!grouped[nameKey]) {
      grouped[typeKey][nameKey] = {
        type: prompt.type,
        name: prompt.name,
        activeVersion: null,
        totalVersions: 0,
        latestUpdate: prompt.createdAt,
      };
    }

    grouped[typeKey][nameKey].totalVersions++;

    if (prompt.isActive) {
      grouped[typeKey][nameKey].activeVersion = prompt;
    }

    if (prompt.createdAt > grouped[typeKey][nameKey].latestUpdate) {
      grouped[typeKey][nameKey].latestUpdate = prompt.createdAt;
    }
  });

  return NextResponse.json(grouped);
}

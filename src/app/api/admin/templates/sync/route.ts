import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Execute sync script
    const { stdout, stderr } = await execAsync("pnpm templates:sync");

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr || null,
    });
  } catch (error: any) {
    console.error("Error syncing templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync templates",
        output: error.stdout || "",
        errors: error.stderr || error.message,
      },
      { status: 500 }
    );
  }
}

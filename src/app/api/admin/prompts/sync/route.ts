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

  // Production environment warning
  const isProduction = process.env.NODE_ENV === "production";
  const allowSyncInProduction = process.env.ALLOW_SYNC_API === "true";

  if (isProduction && !allowSyncInProduction) {
    return NextResponse.json(
      {
        success: false,
        error: "Sync API is disabled in production",
        message:
          "For safety, sync should be run locally or in CI. " +
          "If you need to sync in production, set ALLOW_SYNC_API=true environment variable. " +
          "Recommended: Run 'pnpm prompts:sync' locally or in CI pipeline.",
      },
      { status: 403 }
    );
  }

  try {
    // Execute sync script
    const { stdout, stderr } = await execAsync("pnpm prompts:sync");

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr || null,
      warning: isProduction
        ? "⚠️ Running sync in production. Consider using local/CI sync instead."
        : null,
    });
  } catch (error: any) {
    console.error("Error syncing prompts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync prompts",
        output: error.stdout || "",
        errors: error.stderr || error.message,
      },
      { status: 500 }
    );
  }
}

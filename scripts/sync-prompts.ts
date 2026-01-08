import { PrismaClient, PromptType, SourceType } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

interface PromptFrontmatter {
  name: string;
  version: string;
  type: string;
  description?: string;
}

// Parse YAML frontmatter from Markdown file
function parseFrontmatter(content: string): {
  frontmatter: PromptFrontmatter;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error("No frontmatter found");
  }

  const frontmatterText = match[1];
  const body = match[2].trim();

  // Simple YAML parser (handles key: value pairs)
  const frontmatter: any = {};
  frontmatterText.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  });

  return { frontmatter: frontmatter as PromptFrontmatter, body };
}

// Calculate SHA256 hash
function calculateHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

// Map file type to PromptType enum
function mapPromptType(typeString: string): PromptType {
  const typeMap: Record<string, PromptType> = {
    SUMMARIZE: PromptType.SUMMARIZE,
    DRAFT: PromptType.DRAFT,
    CLASSIFY: PromptType.CLASSIFY,
    REVIEW: PromptType.REVIEW,
    REWRITE: PromptType.REWRITE,
  };

  const type = typeMap[typeString.toUpperCase()];
  if (!type) {
    throw new Error(`Invalid prompt type: ${typeString}`);
  }
  return type;
}

async function syncPrompts() {
  console.log("🔄 Syncing prompts from prompts/ directory...\n");

  const promptsDir = path.join(process.cwd(), "prompts");
  const files = await fs.readdir(promptsDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  let addedCount = 0;
  let skippedCount = 0;
  let activatedCount = 0;

  for (const file of mdFiles) {
    const filePath = path.join(promptsDir, file);
    const relativeFilePath = path.relative(process.cwd(), filePath);
    const content = await fs.readFile(filePath, "utf-8");

    try {
      const { frontmatter, body } = parseFrontmatter(content);
      const contentHash = calculateHash(body);
      const promptType = mapPromptType(frontmatter.type);

      console.log(`📄 Processing: ${file}`);
      console.log(`   Name: ${frontmatter.name}`);
      console.log(`   Version: ${frontmatter.version}`);
      console.log(`   Type: ${frontmatter.type}`);

      // Check if this exact version exists
      const existing = await prisma.promptVersion.findFirst({
        where: {
          type: promptType,
          name: frontmatter.name,
          version: frontmatter.version,
          sourceType: SourceType.FILE,
        },
      });

      if (existing) {
        // Check if content changed
        if (existing.contentHash === contentHash) {
          console.log(`   ✓ Skipped (no changes)\n`);
          skippedCount++;
          continue;
        } else {
          console.log(`   ⚠️  Content changed, but version exists`);
          console.log(
            `   Suggestion: Increment version in ${file} frontmatter\n`
          );
          skippedCount++;
          continue;
        }
      }

      // Create new version
      const newVersion = await prisma.promptVersion.create({
        data: {
          type: promptType,
          name: frontmatter.name,
          version: frontmatter.version,
          description: frontmatter.description || null,
          content: body,
          sourceType: SourceType.FILE,
          filePath: relativeFilePath,
          contentHash,
          isActive: false, // Will be activated below if it's the latest
        },
      });

      console.log(`   ✅ Created new version: ${newVersion.id}`);
      addedCount++;

      // Auto-activate if this is the latest version (highest version number)
      // For simplicity, we'll activate the newly added file version
      // In production, you might want more sophisticated version comparison
      const currentActive = await prisma.promptVersion.findFirst({
        where: {
          type: promptType,
          name: frontmatter.name,
          isActive: true,
        },
      });

      if (!currentActive) {
        // No active version exists, activate this one
        await prisma.promptVersion.update({
          where: { id: newVersion.id },
          data: { isActive: true },
        });

        console.log(`   🎯 Activated (no previous active version)`);
        activatedCount++;
      } else {
        console.log(`   ℹ️  Not activated (active version exists)`);
        console.log(
          `   Use Admin UI to activate if this should replace the current version`
        );
      }

      console.log();
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error);
      console.log();
    }
  }

  console.log("📊 Summary:");
  console.log(`   Added: ${addedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Auto-activated: ${activatedCount}`);
  console.log();
  console.log("✅ Prompt sync completed");
}

syncPrompts()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

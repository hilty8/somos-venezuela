import { PrismaClient, SourceType } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const prisma = new PrismaClient();

interface TemplateFrontmatter {
  name: string;
  version: string;
  description?: string;
}

// Parse YAML frontmatter from Markdown file
function parseFrontmatter(content: string): {
  frontmatter: TemplateFrontmatter;
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

  return { frontmatter: frontmatter as TemplateFrontmatter, body };
}

// Extract JSON from Markdown code block
function extractJSON(body: string): any {
  // Look for ```json ... ``` block
  const jsonRegex = /```json\n([\s\S]*?)\n```/;
  const match = body.match(jsonRegex);

  if (!match) {
    throw new Error("No JSON code block found");
  }

  return JSON.parse(match[1]);
}

// Calculate SHA256 hash
function calculateHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function syncTemplates() {
  console.log("🔄 Syncing templates from templates/ directory...\n");

  const templatesDir = path.join(process.cwd(), "templates");
  const files = await fs.readdir(templatesDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  let addedCount = 0;
  let skippedCount = 0;
  let activatedCount = 0;

  for (const file of mdFiles) {
    const filePath = path.join(templatesDir, file);
    const relativeFilePath = path.relative(process.cwd(), filePath);
    const content = await fs.readFile(filePath, "utf-8");

    try {
      const { frontmatter, body } = parseFrontmatter(content);
      const templateJSON = extractJSON(body);
      const contentHash = calculateHash(JSON.stringify(templateJSON));

      console.log(`📄 Processing: ${file}`);
      console.log(`   Name: ${frontmatter.name}`);
      console.log(`   Version: ${frontmatter.version}`);

      // Check if this exact version exists
      const existing = await prisma.templateVersion.findFirst({
        where: {
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
      const newVersion = await prisma.templateVersion.create({
        data: {
          name: frontmatter.name,
          version: frontmatter.version,
          description: frontmatter.description || null,
          content: templateJSON,
          sourceType: SourceType.FILE,
          filePath: relativeFilePath,
          contentHash,
          isActive: false, // Will be activated below if appropriate
        },
      });

      console.log(`   ✅ Created new version: ${newVersion.id}`);
      addedCount++;

      // Auto-activate if this is the only version for this template name
      const currentActive = await prisma.templateVersion.findFirst({
        where: {
          name: frontmatter.name,
          isActive: true,
        },
      });

      if (!currentActive) {
        // No active version exists, activate this one
        await prisma.templateVersion.update({
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
  console.log("✅ Template sync completed");
}

syncTemplates()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

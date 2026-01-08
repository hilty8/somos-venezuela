import { PrismaClient } from "@prisma/client";
import RSSParser from "rss-parser";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();
const rssParser = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent": "Somos Venezuela Bot/1.0 (+https://somos-venezuela.org)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

interface FetchResult {
  success: boolean;
  itemsAdded: number;
  itemsSkipped: number;
  error?: string;
}

async function fetchRSS(source: {
  id: string;
  name: string;
  url: string;
}): Promise<FetchResult> {
  try {
    console.log(`  📡 Fetching RSS from: ${source.url}`);

    const feed = await rssParser.parseURL(source.url);

    let itemsAdded = 0;
    let itemsSkipped = 0;

    console.log(`  Found ${feed.items.length} items in feed`);

    for (const item of feed.items) {
      // Skip items without a link (URL)
      if (!item.link) {
        itemsSkipped++;
        continue;
      }

      try {
        // Check if URL already exists (deduplication)
        const existing = await prisma.rawItem.findUnique({
          where: { url: item.link },
        });

        if (existing) {
          itemsSkipped++;
          continue;
        }

        // Create new raw item
        await prisma.rawItem.create({
          data: {
            sourceId: source.id,
            url: item.link,
            title: item.title || null,
            content: item.contentSnippet || item.content || null,
            publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          },
        });

        itemsAdded++;
      } catch (error) {
        // URL duplicate constraint violation - skip
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          itemsSkipped++;
        } else {
          console.error(`  ⚠️  Error saving item ${item.link}:`, error);
        }
      }
    }

    return {
      success: true,
      itemsAdded,
      itemsSkipped,
    };
  } catch (error) {
    return {
      success: false,
      itemsAdded: 0,
      itemsSkipped: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchScrape(source: {
  id: string;
  name: string;
  url: string;
}): Promise<FetchResult> {
  try {
    console.log(`  🌐 Scraping from: ${source.url}`);

    // Minimal scraping implementation
    // For now, we'll just fetch the page and look for article links
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "Somos Venezuela Bot/1.0 (+https://somos-venezuela.org)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let itemsAdded = 0;
    let itemsSkipped = 0;

    // Look for common article link patterns
    // This is a basic implementation - can be enhanced later
    const links = new Set<string>();

    $('a[href*="/news/"], a[href*="/story/"], a[href*="/article/"]').each(
      (_, elem) => {
        const href = $(elem).attr("href");
        if (href) {
          // Normalize URL
          const url = href.startsWith("http")
            ? href
            : new URL(href, source.url).toString();
          links.add(url);
        }
      }
    );

    console.log(`  Found ${links.size} potential article links`);

    for (const url of Array.from(links)) {
      try {
        // Check if URL already exists (deduplication)
        const existing = await prisma.rawItem.findUnique({
          where: { url },
        });

        if (existing) {
          itemsSkipped++;
          continue;
        }

        // Create new raw item (minimal data for scraping)
        await prisma.rawItem.create({
          data: {
            sourceId: source.id,
            url,
            title: null, // Will be fetched later if needed
            content: null,
            publishedAt: null,
          },
        });

        itemsAdded++;
      } catch (error) {
        // URL duplicate constraint violation - skip
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          itemsSkipped++;
        } else {
          console.error(`  ⚠️  Error saving item ${url}:`, error);
        }
      }
    }

    return {
      success: true,
      itemsAdded,
      itemsSkipped,
    };
  } catch (error) {
    return {
      success: false,
      itemsAdded: 0,
      itemsSkipped: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  console.log("🚀 Starting source fetch worker...");

  const sources = await prisma.source.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${sources.length} active sources`);

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const source of sources) {
    console.log(`\n📰 Processing: ${source.name} (${source.fetchMethod})`);

    try {
      let result: FetchResult;

      if (source.fetchMethod === "rss") {
        result = await fetchRSS(source);
      } else if (source.fetchMethod === "scrape") {
        result = await fetchScrape(source);
      } else {
        console.log(`  ⚠️  Unknown fetch method: ${source.fetchMethod}`);
        continue;
      }

      if (result.success) {
        totalAdded += result.itemsAdded;
        totalSkipped += result.itemsSkipped;

        // Update source timestamp
        await prisma.source.update({
          where: { id: source.id },
          data: { updatedAt: new Date() },
        });

        console.log(
          `  ✅ Success: ${result.itemsAdded} added, ${result.itemsSkipped} skipped (duplicates)`
        );
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing source ${source.name}:`, error);
    }

    // Rate limiting: wait 3 seconds between sources (ethical scraping)
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log(`\n✅ Source fetch worker completed`);
  console.log(`📊 Total: ${totalAdded} items added, ${totalSkipped} duplicates skipped`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

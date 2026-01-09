import { PrismaClient } from "@prisma/client";
import { fetchDonationAmount } from "../src/lib/fetch-donation-amount";

const prisma = new PrismaClient();

async function main() {
  const startTime = Date.now();
  console.log("🚀 Starting donation fetch worker...");

  // Check kill switch
  const isEnabled = process.env.FETCH_DONATIONS_ENABLED !== "false";
  if (!isEnabled) {
    const duration = Date.now() - startTime;
    console.log("⚠️  FETCH_DONATIONS_ENABLED=false - Worker disabled. Exiting.");
    console.log(
      `[fetch-donations] status=skipped total=0 success=0 failed=0 duration_ms=${duration} reason=kill_switch`
    );
    return;
  }

  const campaigns = await prisma.donationCampaign.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${campaigns.length} active campaigns`);

  let successCount = 0;
  let failedCount = 0;

  for (const campaign of campaigns) {
    console.log(`\n📊 Fetching: ${campaign.name}`);

    try {
      const result = await fetchDonationAmount(
        campaign.publicTotalUrl,
        campaign.parseConfig as { selector?: string; regex?: string; currency?: string },
        10000
      );

      if (result.success) {
        // Save snapshot
        await prisma.donationSnapshot.create({
          data: {
            campaignId: campaign.id,
            amount: result.amount!,
            currency: result.currency || "USD",
            rawValue: result.rawValue,
          },
        });

        // Update campaign
        await prisma.donationCampaign.update({
          where: { id: campaign.id },
          data: {
            lastFetchAt: new Date(),
            lastError: null,
            errorCount: 0,
          },
        });

        console.log(`✅ Success: ${result.amount} ${result.currency}`);
        successCount++;
      } else {
        // Update error
        await prisma.donationCampaign.update({
          where: { id: campaign.id },
          data: {
            lastError: result.error || "Unknown error",
            errorCount: { increment: 1 },
          },
        });

        console.log(`❌ Failed: ${result.error}`);
        failedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing campaign ${campaign.name}:`, error);
      failedCount++;

      await prisma.donationCampaign.update({
        where: { id: campaign.id },
        data: {
          lastError: error instanceof Error ? error.message : "Unknown error",
          errorCount: { increment: 1 },
        },
      });
    }

    // Rate limiting: wait 2 seconds between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const duration = Date.now() - startTime;

  console.log("\n✅ Donation fetch worker completed");

  // Summary log (1-line for monitoring)
  console.log(
    `[fetch-donations] status=success total=${campaigns.length} success=${successCount} failed=${failedCount} duration_ms=${duration}`
  );
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

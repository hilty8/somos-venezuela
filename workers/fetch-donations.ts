import { PrismaClient } from "@prisma/client";
import { fetchDonationAmount } from "../src/lib/fetch-donation-amount";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting donation fetch worker...");

  const campaigns = await prisma.donationCampaign.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${campaigns.length} active campaigns`);

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
      }
    } catch (error) {
      console.error(`❌ Error processing campaign ${campaign.name}:`, error);

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

  console.log("\n✅ Donation fetch worker completed");
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

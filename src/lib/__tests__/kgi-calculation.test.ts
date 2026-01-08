import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";

// Mock data structure matching Prisma schema
interface DonationSnapshot {
  id: string;
  campaignId: string;
  amount: Decimal;
  currency: string;
  fetchedAt: Date;
  rawValue: string | null;
}

interface DonationCampaign {
  id: string;
  name: string;
  isActive: boolean;
  snapshots: DonationSnapshot[];
}

// KGI calculation logic (extracted from page.tsx)
function calculateKGI(campaigns: DonationCampaign[]): {
  totalAmount: number;
  lastUpdate: Date | null;
} {
  let totalAmount = 0;
  let lastUpdate: Date | null = null;

  for (const campaign of campaigns) {
    if (campaign.snapshots.length > 0) {
      const snapshot = campaign.snapshots[0]; // Most recent
      totalAmount += Number(snapshot.amount);

      if (!lastUpdate || snapshot.fetchedAt > lastUpdate) {
        lastUpdate = snapshot.fetchedAt;
      }
    }
  }

  return { totalAmount, lastUpdate };
}

describe("KGI Calculation", () => {
  describe("Single campaign", () => {
    it("should calculate total from one campaign with one snapshot", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [
            {
              id: "snap1",
              campaignId: "camp1",
              amount: new Decimal("1000.50"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$1,000.50",
            },
          ],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBe(1000.50);
      expect(result.lastUpdate).toEqual(new Date("2024-01-01T12:00:00Z"));
    });

    it("should use most recent snapshot only", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [
            {
              id: "snap2",
              campaignId: "camp1",
              amount: new Decimal("2000.00"), // Most recent
              currency: "USD",
              fetchedAt: new Date("2024-01-02T12:00:00Z"),
              rawValue: "$2,000.00",
            },
            {
              id: "snap1",
              campaignId: "camp1",
              amount: new Decimal("1000.00"), // Older
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$1,000.00",
            },
          ],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBe(2000.00);
      expect(result.lastUpdate).toEqual(new Date("2024-01-02T12:00:00Z"));
    });
  });

  describe("Multiple campaigns", () => {
    it("should sum amounts from multiple campaigns", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [
            {
              id: "snap1",
              campaignId: "camp1",
              amount: new Decimal("1000.00"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$1,000.00",
            },
          ],
        },
        {
          id: "camp2",
          name: "Campaign 2",
          isActive: true,
          snapshots: [
            {
              id: "snap2",
              campaignId: "camp2",
              amount: new Decimal("2500.50"),
              currency: "USD",
              fetchedAt: new Date("2024-01-02T12:00:00Z"),
              rawValue: "$2,500.50",
            },
          ],
        },
        {
          id: "camp3",
          name: "Campaign 3",
          isActive: true,
          snapshots: [
            {
              id: "snap3",
              campaignId: "camp3",
              amount: new Decimal("500.25"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T18:00:00Z"),
              rawValue: "$500.25",
            },
          ],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBe(4000.75);
      expect(result.lastUpdate).toEqual(new Date("2024-01-02T12:00:00Z"));
    });

    it("should find the most recent update across all campaigns", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [
            {
              id: "snap1",
              campaignId: "camp1",
              amount: new Decimal("1000.00"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$1,000.00",
            },
          ],
        },
        {
          id: "camp2",
          name: "Campaign 2",
          isActive: true,
          snapshots: [
            {
              id: "snap2",
              campaignId: "camp2",
              amount: new Decimal("2000.00"),
              currency: "USD",
              fetchedAt: new Date("2024-01-05T18:00:00Z"), // Most recent
              rawValue: "$2,000.00",
            },
          ],
        },
        {
          id: "camp3",
          name: "Campaign 3",
          isActive: true,
          snapshots: [
            {
              id: "snap3",
              campaignId: "camp3",
              amount: new Decimal("500.00"),
              currency: "USD",
              fetchedAt: new Date("2024-01-03T12:00:00Z"),
              rawValue: "$500.00",
            },
          ],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.lastUpdate).toEqual(new Date("2024-01-05T18:00:00Z"));
    });
  });

  describe("Edge cases", () => {
    it("should return 0 and null for empty campaigns array", () => {
      const campaigns: DonationCampaign[] = [];
      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBe(0);
      expect(result.lastUpdate).toBeNull();
    });

    it("should return 0 and null for campaigns with no snapshots", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [],
        },
        {
          id: "camp2",
          name: "Campaign 2",
          isActive: true,
          snapshots: [],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBe(0);
      expect(result.lastUpdate).toBeNull();
    });

    it("should handle mix of campaigns with and without snapshots", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [
            {
              id: "snap1",
              campaignId: "camp1",
              amount: new Decimal("1000.00"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$1,000.00",
            },
          ],
        },
        {
          id: "camp2",
          name: "Campaign 2",
          isActive: true,
          snapshots: [], // No snapshots
        },
        {
          id: "camp3",
          name: "Campaign 3",
          isActive: true,
          snapshots: [
            {
              id: "snap3",
              campaignId: "camp3",
              amount: new Decimal("500.00"),
              currency: "USD",
              fetchedAt: new Date("2024-01-02T12:00:00Z"),
              rawValue: "$500.00",
            },
          ],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBe(1500.00);
      expect(result.lastUpdate).toEqual(new Date("2024-01-02T12:00:00Z"));
    });

    it("should handle decimal precision correctly", () => {
      const campaigns: DonationCampaign[] = [
        {
          id: "camp1",
          name: "Campaign 1",
          isActive: true,
          snapshots: [
            {
              id: "snap1",
              campaignId: "camp1",
              amount: new Decimal("0.01"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$0.01",
            },
          ],
        },
        {
          id: "camp2",
          name: "Campaign 2",
          isActive: true,
          snapshots: [
            {
              id: "snap2",
              campaignId: "camp2",
              amount: new Decimal("0.02"),
              currency: "USD",
              fetchedAt: new Date("2024-01-01T12:00:00Z"),
              rawValue: "$0.02",
            },
          ],
        },
      ];

      const result = calculateKGI(campaigns);
      expect(result.totalAmount).toBeCloseTo(0.03, 2);
    });
  });
});

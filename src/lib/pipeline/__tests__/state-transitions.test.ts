/**
 * Tests for G1 state transitions and locking
 */

import { describe, it, expect } from "vitest";

// Mock state transition logic
type RawItemStatus = "NEW" | "PROCESSING" | "PROCESSED" | "HOLD" | "FAILED";

interface RawItem {
  id: string;
  status: RawItemStatus;
  retryCount: number;
  processingStartedAt: Date | null;
}

const MAX_RETRY = 2;

/**
 * Simulates PROCESSING lock logic
 */
function canLockForProcessing(item: RawItem): boolean {
  // Only NEW and FAILED (within retry limit) can be locked
  if (item.status === "NEW") {
    return true;
  }
  if (item.status === "FAILED" && item.retryCount < MAX_RETRY) {
    return true;
  }
  return false;
}

/**
 * Simulates state transition after pipeline completion
 */
function getFinelStatus(passed: boolean): "PROCESSED" | "HOLD" {
  return passed ? "PROCESSED" : "HOLD";
}

/**
 * Checks if item is stale (PROCESSING too long)
 */
function isStaleProcessing(
  item: RawItem,
  staleMinutes: number
): boolean {
  if (item.status !== "PROCESSING" || !item.processingStartedAt) {
    return false;
  }

  const now = new Date();
  const elapsed = now.getTime() - item.processingStartedAt.getTime();
  const elapsedMinutes = elapsed / 1000 / 60;

  return elapsedMinutes >= staleMinutes;
}

describe("G1 State Transitions", () => {
  describe("PROCESSING Lock", () => {
    it("should allow locking NEW items", () => {
      const item: RawItem = {
        id: "1",
        status: "NEW",
        retryCount: 0,
        processingStartedAt: null,
      };

      expect(canLockForProcessing(item)).toBe(true);
    });

    it("should allow locking FAILED items within retry limit", () => {
      const item: RawItem = {
        id: "1",
        status: "FAILED",
        retryCount: 1,
        processingStartedAt: null,
      };

      expect(canLockForProcessing(item)).toBe(true);
    });

    it("should NOT allow locking FAILED items at retry limit", () => {
      const item: RawItem = {
        id: "1",
        status: "FAILED",
        retryCount: 2,
        processingStartedAt: null,
      };

      expect(canLockForProcessing(item)).toBe(false);
    });

    it("should NOT allow locking PROCESSED items", () => {
      const item: RawItem = {
        id: "1",
        status: "PROCESSED",
        retryCount: 0,
        processingStartedAt: null,
      };

      expect(canLockForProcessing(item)).toBe(false);
    });

    it("should NOT allow locking HOLD items", () => {
      const item: RawItem = {
        id: "1",
        status: "HOLD",
        retryCount: 0,
        processingStartedAt: null,
      };

      expect(canLockForProcessing(item)).toBe(false);
    });
  });

  describe("Final Status Assignment", () => {
    it("should set PROCESSED when review passes", () => {
      expect(getFinelStatus(true)).toBe("PROCESSED");
    });

    it("should set HOLD when review fails", () => {
      expect(getFinelStatus(false)).toBe("HOLD");
    });
  });

  describe("Stale PROCESSING Detection", () => {
    it("should detect stale items after threshold", () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      twoHoursAgo.setMinutes(twoHoursAgo.getMinutes() - 1); // 121 minutes ago

      const item: RawItem = {
        id: "1",
        status: "PROCESSING",
        retryCount: 0,
        processingStartedAt: twoHoursAgo,
      };

      expect(isStaleProcessing(item, 120)).toBe(true);
    });

    it("should NOT detect fresh items as stale", () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const item: RawItem = {
        id: "1",
        status: "PROCESSING",
        retryCount: 0,
        processingStartedAt: oneHourAgo,
      };

      expect(isStaleProcessing(item, 120)).toBe(false);
    });

    it("should NOT detect non-PROCESSING items as stale", () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 3);

      const item: RawItem = {
        id: "1",
        status: "NEW",
        retryCount: 0,
        processingStartedAt: twoHoursAgo,
      };

      expect(isStaleProcessing(item, 120)).toBe(false);
    });
  });

  describe("Retry Limit", () => {
    it("should enforce MAX_RETRY limit", () => {
      expect(MAX_RETRY).toBe(2);

      // Attempt 1: retryCount 0 → 1 (OK)
      // Attempt 2: retryCount 1 → 2 (OK)
      // Attempt 3: retryCount 2 → 3 (BLOCKED)

      const item1: RawItem = {
        id: "1",
        status: "FAILED",
        retryCount: 0,
        processingStartedAt: null,
      };
      expect(canLockForProcessing(item1)).toBe(true);

      const item2: RawItem = {
        id: "1",
        status: "FAILED",
        retryCount: 1,
        processingStartedAt: null,
      };
      expect(canLockForProcessing(item2)).toBe(true);

      const item3: RawItem = {
        id: "1",
        status: "FAILED",
        retryCount: 2,
        processingStartedAt: null,
      };
      expect(canLockForProcessing(item3)).toBe(false);
    });
  });
});

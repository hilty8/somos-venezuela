/**
 * Tests for review attempt limits
 */

import { describe, it, expect } from "vitest";

// Maximum rewrite attempts (from env, default 2)
const MAX_REWRITE_ATTEMPTS = 2;

/**
 * Helper function to simulate review loop logic
 */
function simulateReviewLoop(
  initialReviewPassed: boolean,
  subsequentReviewsPassed: boolean[]
): {
  finalAttempt: number;
  totalReviews: number;
  reachedMaxAttempts: boolean;
} {
  let attemptNumber = 1;
  let passed = initialReviewPassed;

  // First review
  if (passed) {
    return {
      finalAttempt: attemptNumber,
      totalReviews: 1,
      reachedMaxAttempts: false,
    };
  }

  // Rewrite loop
  for (let i = 0; i < subsequentReviewsPassed.length; i++) {
    if (attemptNumber > MAX_REWRITE_ATTEMPTS) {
      break; // Max attempts reached
    }

    attemptNumber++;
    passed = subsequentReviewsPassed[i];

    if (passed) {
      return {
        finalAttempt: attemptNumber,
        totalReviews: attemptNumber,
        reachedMaxAttempts: false,
      };
    }
  }

  return {
    finalAttempt: attemptNumber,
    totalReviews: attemptNumber,
    reachedMaxAttempts: attemptNumber > MAX_REWRITE_ATTEMPTS,
  };
}

describe("Review Attempt Limits", () => {
  it("should pass on first attempt if review passes", () => {
    const result = simulateReviewLoop(true, []);

    expect(result.finalAttempt).toBe(1);
    expect(result.totalReviews).toBe(1);
    expect(result.reachedMaxAttempts).toBe(false);
  });

  it("should allow up to 2 rewrites (3 total reviews)", () => {
    // Fail first, fail second, pass third
    const result = simulateReviewLoop(false, [false, true]);

    expect(result.finalAttempt).toBe(3);
    expect(result.totalReviews).toBe(3);
    expect(result.reachedMaxAttempts).toBe(false);
  });

  it("should stop at max 3 reviews even if all fail", () => {
    // All reviews fail
    const result = simulateReviewLoop(false, [false, false, false, false]);

    expect(result.finalAttempt).toBe(3);
    expect(result.totalReviews).toBe(3);
    expect(result.reachedMaxAttempts).toBe(true);
  });

  it("should pass on second attempt after one rewrite", () => {
    // Fail first, pass second
    const result = simulateReviewLoop(false, [true]);

    expect(result.finalAttempt).toBe(2);
    expect(result.totalReviews).toBe(2);
    expect(result.reachedMaxAttempts).toBe(false);
  });

  it("should enforce MAX_REWRITE_ATTEMPTS = 2 limit", () => {
    expect(MAX_REWRITE_ATTEMPTS).toBe(2);

    // This means:
    // - Attempt 1: Initial review
    // - Attempt 2: After rewrite 1
    // - Attempt 3: After rewrite 2 (final attempt)

    const maxAttempts = MAX_REWRITE_ATTEMPTS + 1;
    expect(maxAttempts).toBe(3);
  });
});

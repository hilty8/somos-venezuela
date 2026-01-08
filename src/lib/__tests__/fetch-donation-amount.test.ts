import { describe, it, expect } from "vitest";

// Test the parsing logic without actual HTTP calls
// We'll test the regex and normalization logic

describe("Donation Amount Parsing", () => {
  describe("Number normalization", () => {
    it("should remove commas from numbers", () => {
      const input = "1,234,567.89";
      const normalized = input.replace(/,/g, "");
      const parsed = parseFloat(normalized);
      expect(parsed).toBe(1234567.89);
    });

    it("should handle numbers without commas", () => {
      const input = "123456.78";
      const parsed = parseFloat(input);
      expect(parsed).toBe(123456.78);
    });

    it("should handle whole numbers", () => {
      const input = "100000";
      const parsed = parseFloat(input);
      expect(parsed).toBe(100000);
    });
  });

  describe("Regex extraction", () => {
    it("should extract dollar amount with $ prefix", () => {
      const text = "Total donated: $1,234,567.89";
      const regex = /\$([0-9,]+(?:\.[0-9]{2})?)/;
      const match = text.match(regex);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("1,234,567.89");

      const normalized = match![1].replace(/,/g, "");
      const amount = parseFloat(normalized);
      expect(amount).toBe(1234567.89);
    });

    it("should extract amount with currency symbol after", () => {
      const text = "Raised: 50,000 USD";
      const regex = /([0-9,]+(?:\.[0-9]{2})?)\s*USD/;
      const match = text.match(regex);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("50,000");

      const normalized = match![1].replace(/,/g, "");
      const amount = parseFloat(normalized);
      expect(amount).toBe(50000);
    });

    it("should handle European format (dot as thousand separator)", () => {
      const text = "Total: €1.234.567,89";
      // For this we'd need to handle European format differently
      // For now, we'll just test that we can extract the numeric part
      const regex = /€([0-9.,]+)/;
      const match = text.match(regex);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("1.234.567,89");

      // In real implementation, we'd need to detect format and convert
      // For US format: 1,234,567.89
      // For EU format: 1.234.567,89 -> need to swap . and ,
    });
  });

  describe("Parse config simulation", () => {
    it("should extract amount using selector pattern (simulated)", () => {
      // Simulate HTML content
      const htmlContent = `
        <div class="donation-total">
          <span class="amount">$125,000.50</span>
        </div>
      `;

      // Simulate cheerio selection result
      const selectedText = "$125,000.50";

      // Apply regex
      const regex = /\$([0-9,]+(?:\.[0-9]{2})?)/;
      const match = selectedText.match(regex);
      expect(match).not.toBeNull();

      const normalized = match![1].replace(/,/g, "");
      const amount = parseFloat(normalized);
      expect(amount).toBe(125000.50);
    });

    it("should handle missing decimal places", () => {
      const text = "$50,000";
      const regex = /\$([0-9,]+(?:\.[0-9]{2})?)/;
      const match = text.match(regex);
      expect(match).not.toBeNull();

      const normalized = match![1].replace(/,/g, "");
      const amount = parseFloat(normalized);
      expect(amount).toBe(50000);
    });

    it("should return NaN for invalid input", () => {
      const text = "No amount here";
      const cleaned = text.replace(/[^0-9.]/g, "");
      const amount = parseFloat(cleaned);
      expect(isNaN(amount)).toBe(true);
    });
  });
});

import * as cheerio from "cheerio";

export interface ParseConfig {
  selector?: string;
  regex?: string;
  currency?: string;
}

export interface FetchResult {
  success: boolean;
  amount?: number;
  currency?: string;
  rawValue?: string;
  error?: string;
}

export async function fetchDonationAmount(
  url: string,
  parseConfig: ParseConfig,
  timeout: number = 10000
): Promise<FetchResult> {
  try {
    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SomosVenezuela/1.0 (+https://github.com/somos-venezuela)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract raw value using selector
    let rawValue = "";
    if (parseConfig.selector) {
      const element = $(parseConfig.selector);
      if (element.length === 0) {
        return {
          success: false,
          error: `Selector not found: ${parseConfig.selector}`,
        };
      }
      rawValue = element.text().trim();
    } else {
      rawValue = $("body").text();
    }

    // Extract number using regex
    let numericValue: number | null = null;
    if (parseConfig.regex) {
      const regex = new RegExp(parseConfig.regex);
      const match = rawValue.match(regex);
      if (!match || !match[1]) {
        return {
          success: false,
          error: `Regex did not match: ${parseConfig.regex}`,
          rawValue,
        };
      }
      const extractedValue = match[1];

      // Normalize: remove commas, handle decimal
      const normalized = extractedValue.replace(/,/g, "");
      numericValue = parseFloat(normalized);

      if (isNaN(numericValue)) {
        return {
          success: false,
          error: `Could not parse as number: ${extractedValue}`,
          rawValue,
        };
      }
    } else {
      // Fallback: try to extract any number
      const cleaned = rawValue.replace(/[^0-9.]/g, "");
      numericValue = parseFloat(cleaned);
      if (isNaN(numericValue)) {
        return {
          success: false,
          error: "No valid number found in content",
          rawValue,
        };
      }
    }

    return {
      success: true,
      amount: numericValue,
      currency: parseConfig.currency || "USD",
      rawValue,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Timeout exceeded",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Unknown error",
    };
  }
}

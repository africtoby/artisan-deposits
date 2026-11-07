import { describe, expect, it } from "vitest";
import { CURRENCIES, CURRENCY_CODES, formatMinor, formatSats, isCurrencyCode } from "./currencies";

describe("currencies table", () => {
  it("covers the eight supported currencies", () => {
    expect([...CURRENCY_CODES].sort()).toEqual(
      ["EUR", "GBP", "GHS", "KES", "NGN", "USD", "XOF", "ZAR"].sort(),
    );
  });

  it("gives XOF no decimals and every other currency two", () => {
    expect(CURRENCIES.XOF.decimals).toBe(0);
    for (const code of CURRENCY_CODES.filter((c) => c !== "XOF")) {
      expect(CURRENCIES[code].decimals).toBe(2);
    }
  });

  it("recognises only supported codes", () => {
    expect(isCurrencyCode("NGN")).toBe(true);
    expect(isCurrencyCode("JPY")).toBe(false);
    expect(isCurrencyCode("ngn")).toBe(false);
  });
});

describe("formatMinor", () => {
  it("drops the decimals for whole amounts", () => {
    expect(formatMinor(4_000_000n, "NGN")).toBe("₦40,000");
    expect(formatMinor(1200n, "USD")).toBe("$12");
  });

  it("shows every decimal when there is a fraction", () => {
    expect(formatMinor(1250n, "USD")).toBe("$12.50");
    expect(formatMinor(5n, "GBP")).toBe("£0.05");
  });

  it("treats XOF as whole units", () => {
    expect(formatMinor(25_000n, "XOF")).toBe("CFA 25,000");
  });

  it("spaces alphabetic symbols only", () => {
    expect(formatMinor(400_000n, "KES")).toBe("KSh 4,000");
    expect(formatMinor(40_000n, "ZAR")).toBe("R400");
  });

  it("is exact for amounts beyond the safe floating point range", () => {
    expect(formatMinor(900_719_925_474_099_300n, "USD")).toBe("$9,007,199,254,740,993");
  });

  it("handles zero and negatives", () => {
    expect(formatMinor(0n, "EUR")).toBe("€0");
    expect(formatMinor(-1250n, "EUR")).toBe("-€12.50");
  });
});

describe("formatSats", () => {
  it("groups thousands", () => {
    expect(formatSats(31_250n)).toBe("31,250");
  });
});

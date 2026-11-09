import { describe, expect, it } from "vitest";
import { fiatToSats, parseMajorToMinor, rateToText, satsToFiatMinor } from "./convert";

describe("satsToFiatMinor", () => {
  it("is the reverse of fiatToSats at a round rate", () => {
    // 1 NGN is exactly 1 sat at this rate.
    expect(satsToFiatMinor(40_000n, "NGN", "100000000.00000000")).toBe(4_000_000n);
  });

  it("respects the number of decimals", () => {
    expect(satsToFiatMinor(5000n, "XOF", "100000000")).toBe(5000n);
    expect(satsToFiatMinor(10_000n, "USD", "100000.00000000")).toBe(1000n);
  });

  it("rounds to the nearest minor unit", () => {
    // 1 sat is 0.004 NGN here: under half a kobo rounds down, half a kobo or more rounds up.
    expect(satsToFiatMinor(1n, "NGN", "400000.00000000")).toBe(0n);
    expect(satsToFiatMinor(125n, "NGN", "400000.00000000")).toBe(50n);
    expect(satsToFiatMinor(1n, "NGN", "5000000.00000000")).toBe(5n);
  });

  it("handles zero and very large balances without losing digits", () => {
    expect(satsToFiatMinor(0n, "NGN", "100000000")).toBe(0n);
    expect(satsToFiatMinor(2_100_000_000_000_000n, "USD", "100000")).toBe(
      2_100_000_000_000n * 100n,
    );
  });

  it("rejects a negative balance and a bad rate", () => {
    expect(() => satsToFiatMinor(-1n, "USD", "100000")).toThrow();
    expect(() => satsToFiatMinor(1n, "USD", "0")).toThrow();
  });
});

describe("fiatToSats", () => {
  it("converts naira at a round rate", () => {
    // 100,000,000 NGN per BTC means 1 NGN is exactly 1 sat.
    expect(fiatToSats(100n, "NGN", "100000000.00000000")).toBe(1n);
    expect(fiatToSats(4_000_000n, "NGN", "100000000.00000000")).toBe(40_000n);
  });

  it("rounds up, never down", () => {
    // 1 kobo at 3 NGN per sat is a third of a hundredth of a sat, which still costs 1 sat.
    expect(fiatToSats(1n, "NGN", "300000000.00000000")).toBe(1n);
    expect(fiatToSats(101n, "NGN", "100000000.00000000")).toBe(2n);
  });

  it("treats XOF as having no decimals", () => {
    // 1 XOF per sat: 5,000 XOF must be 5,000 sats, not 50.
    expect(fiatToSats(5000n, "XOF", "100000000")).toBe(5000n);
  });

  it("handles USD cents", () => {
    // $100,000 per BTC: $10.00 is 10,000 sats.
    expect(fiatToSats(1000n, "USD", "100000.00000000")).toBe(10_000n);
  });

  it("gives zero for zero", () => {
    expect(fiatToSats(0n, "USD", "100000")).toBe(0n);
  });

  it("rejects bad input", () => {
    expect(() => fiatToSats(-1n, "USD", "100000")).toThrow();
    expect(() => fiatToSats(1n, "USD", "0")).toThrow();
    expect(() => fiatToSats(1n, "USD", "abc")).toThrow();
  });
});

describe("rateToText", () => {
  it("keeps 8 decimals and refuses nonsense", () => {
    expect(rateToText(104242478.05)).toBe("104242478.05000000");
    expect(() => rateToText(0)).toThrow();
    expect(() => rateToText(Number.NaN)).toThrow();
  });
});

describe("parseMajorToMinor", () => {
  it("reads whole and fractional amounts", () => {
    expect(parseMajorToMinor("40000", "NGN")).toBe(4_000_000n);
    expect(parseMajorToMinor("40,000.50", "NGN")).toBe(4_000_050n);
    expect(parseMajorToMinor("12.5", "USD")).toBe(1250n);
  });

  it("rejects extra decimals, junk and negatives", () => {
    expect(parseMajorToMinor("12.345", "USD")).toBeNull();
    expect(parseMajorToMinor("5000.5", "XOF")).toBeNull();
    expect(parseMajorToMinor("-5", "USD")).toBeNull();
    expect(parseMajorToMinor("abc", "USD")).toBeNull();
    expect(parseMajorToMinor("", "USD")).toBeNull();
  });

  it("accepts XOF whole numbers", () => {
    expect(parseMajorToMinor("25000", "XOF")).toBe(25000n);
  });
});

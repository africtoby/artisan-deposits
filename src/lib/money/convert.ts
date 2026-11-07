import { CURRENCIES, type CurrencyCode } from "./currencies";

const RATE_DECIMALS = 8;
const SATS_PER_BTC = 100_000_000n;

// A rate is "whole units of fiat per 1 BTC", kept as text so it can go to and from a Decimal column
// without ever passing through a float after it is first read.
export function rateToText(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error("Exchange rate must be a positive number.");
  return rate.toFixed(RATE_DECIMALS);
}

function rateToScaled(rateText: string): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(rateText);
  if (!match) throw new Error("Exchange rate is not a plain decimal number.");
  const fraction = (match[2] ?? "").padEnd(RATE_DECIMALS, "0").slice(0, RATE_DECIMALS);
  const scaled = BigInt(match[1]) * 10n ** BigInt(RATE_DECIMALS) + BigInt(fraction);
  if (scaled <= 0n) throw new Error("Exchange rate must be above zero.");
  return scaled;
}

// Rounds UP so the seller is never paid a fraction of a sat less than the price.
export function fiatToSats(fiatMinor: bigint, currency: CurrencyCode, rateText: string): bigint {
  if (fiatMinor < 0n) throw new Error("Amount cannot be negative.");
  const numerator = fiatMinor * SATS_PER_BTC * 10n ** BigInt(RATE_DECIMALS);
  const denominator = rateToScaled(rateText) * 10n ** BigInt(CURRENCIES[currency].decimals);
  return (numerator + denominator - 1n) / denominator;
}

// Turns what a person typed ("40000", "12.5") into the smallest unit. Rejects more decimals than
// the currency has, rather than silently rounding someone's price.
export function parseMajorToMinor(input: string, currency: CurrencyCode): bigint | null {
  const { decimals } = CURRENCIES[currency];
  const match = /^(\d{1,12})(?:\.(\d+))?$/.exec(input.trim().replace(/,/g, ""));
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;
  return BigInt(match[1]) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

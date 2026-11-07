import { CURRENCY_CODES, type CurrencyCode } from "@/lib/money/currencies";

// Fiat (whole units) per 1 BTC, as plain decimal text. See rateToText in convert.ts.
export type RateTable = Record<CurrencyCode, string>;

export type RateSource = {
  name: string;
  fetchRates(): Promise<RateTable>;
};

export class RateUnavailableError extends Error {
  constructor() {
    super("Couldn't get today's exchange rate. Try again in a minute.");
    this.name = "RateUnavailableError";
  }
}

export const RATE_CACHE_MS = 60_000;
export const RATE_FETCH_TIMEOUT_MS = 5_000;

export type RateLookup = { rate: string; source: string };

// Sources are tried in order. A source that returns a table missing a currency counts as failed,
// so we never invent or guess a rate. Cached for a minute to stay inside free-tier limits.
export function createRateProvider(
  sources: RateSource[],
  now: () => number = Date.now,
  cacheMs: number = RATE_CACHE_MS,
) {
  let cached: { table: RateTable; source: string; fetchedAt: number } | undefined;
  let inFlight: Promise<{ table: RateTable; source: string }> | undefined;

  async function load(): Promise<{ table: RateTable; source: string }> {
    for (const source of sources) {
      try {
        const table = await source.fetchRates();
        if (CURRENCY_CODES.every((code) => table[code])) return { table, source: source.name };
      } catch {
        // Fall through to the next source. The error is not logged: it can hold a request URL.
      }
    }
    throw new RateUnavailableError();
  }

  return {
    async getRate(currency: CurrencyCode): Promise<RateLookup> {
      if (!cached || now() - cached.fetchedAt >= cacheMs) {
        // One refresh at a time, so a burst of requests makes one call to the rate source.
        inFlight ??= load().finally(() => {
          inFlight = undefined;
        });
        const loaded = await inFlight;
        cached = { ...loaded, fetchedAt: now() };
      }
      return { rate: cached.table[currency], source: cached.source };
    },
  };
}

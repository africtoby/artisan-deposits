import { z } from "zod";
import { rateToText } from "@/lib/money/convert";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/money/currencies";
import { RATE_FETCH_TIMEOUT_MS, type RateSource, type RateTable } from "./rate-provider";

// Demo-tier endpoint and header from CoinGecko's current docs (/simple/price).
const URL_BASE = "https://api.coingecko.com/api/v3/simple/price";

const positive = z.number().positive();

const responseSchema = z.object({
  bitcoin: z.object({
    ngn: positive,
    kes: positive,
    ghs: positive,
    zar: positive,
    xof: positive,
    usd: positive,
    eur: positive,
    gbp: positive,
  }),
});

export function parseCoingeckoResponse(body: unknown): RateTable {
  const { bitcoin } = responseSchema.parse(body);
  const table = {} as RateTable;
  for (const code of CURRENCY_CODES) {
    table[code] = rateToText(bitcoin[code.toLowerCase() as Lowercase<CurrencyCode>]);
  }
  return table;
}

export function createCoingeckoSource(apiKey: string | undefined): RateSource {
  return {
    name: "coingecko",
    async fetchRates() {
      const url = `${URL_BASE}?ids=bitcoin&vs_currencies=${CURRENCY_CODES.map((c) => c.toLowerCase()).join(",")}`;
      const response = await fetch(url, {
        headers: apiKey ? { "x-cg-demo-api-key": apiKey } : {},
        signal: AbortSignal.timeout(RATE_FETCH_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`CoinGecko answered ${response.status}`);
      return parseCoingeckoResponse(await response.json());
    },
  };
}

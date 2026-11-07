import { z } from "zod";
import { rateToText } from "@/lib/money/convert";
import { CURRENCY_CODES } from "@/lib/money/currencies";
import { RATE_FETCH_TIMEOUT_MS, type RateSource, type RateTable } from "./rate-provider";

// Yadio's public rates. Its docs page was empty when we checked, so treat this as an unofficial
// backup that returned all 8 of our currencies. It is only used when CoinGecko fails.
const URL_BASE = "https://api.yadio.io/exrates/BTC";

const positive = z.number().positive();

const responseSchema = z.object({
  BTC: z.object({
    NGN: positive,
    KES: positive,
    GHS: positive,
    ZAR: positive,
    XOF: positive,
    USD: positive,
    EUR: positive,
    GBP: positive,
  }),
});

export function parseYadioResponse(body: unknown): RateTable {
  const { BTC } = responseSchema.parse(body);
  const table = {} as RateTable;
  for (const code of CURRENCY_CODES) table[code] = rateToText(BTC[code]);
  return table;
}

export const yadioSource: RateSource = {
  name: "yadio",
  async fetchRates() {
    const response = await fetch(URL_BASE, {
      signal: AbortSignal.timeout(RATE_FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Yadio answered ${response.status}`);
    return parseYadioResponse(await response.json());
  },
};

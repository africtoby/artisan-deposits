import "server-only";
import { getServerEnv } from "@/lib/env";
import type { CurrencyCode } from "@/lib/money/currencies";
import { createCoingeckoSource } from "./coingecko";
import { yadioSource } from "./fallback";
import { createRateProvider } from "./rate-provider";

const holder = globalThis as typeof globalThis & {
  __rates?: ReturnType<typeof createRateProvider>;
};

// Built on first use so importing this file never needs environment variables. Kept on globalThis
// so dev hot reload does not throw the cache away.
export function getRate(currency: CurrencyCode) {
  holder.__rates ??= createRateProvider([
    createCoingeckoSource(getServerEnv().COINGECKO_API_KEY),
    yadioSource,
  ]);
  return holder.__rates.getRate(currency);
}

import { describe, expect, it, vi } from "vitest";
import { CURRENCY_CODES } from "@/lib/money/currencies";
import { parseCoingeckoResponse } from "./coingecko";
import { parseYadioResponse } from "./fallback";
import {
  createRateProvider,
  RateUnavailableError,
  type RateSource,
  type RateTable,
} from "./rate-provider";

function table(value: string): RateTable {
  return Object.fromEntries(CURRENCY_CODES.map((code) => [code, value])) as RateTable;
}

function source(name: string, fetchRates: () => Promise<RateTable>): RateSource {
  return { name, fetchRates };
}

describe("createRateProvider", () => {
  it("uses the first source when it works", async () => {
    const provider = createRateProvider([
      source("a", async () => table("100.00000000")),
      source("b", async () => table("200.00000000")),
    ]);
    expect(await provider.getRate("NGN")).toEqual({ rate: "100.00000000", source: "a" });
  });

  it("falls back when the first source fails", async () => {
    const provider = createRateProvider([
      source("a", async () => Promise.reject(new Error("down"))),
      source("b", async () => table("200.00000000")),
    ]);
    expect(await provider.getRate("USD")).toEqual({ rate: "200.00000000", source: "b" });
  });

  it("treats a table with a missing currency as a failure", async () => {
    const partial = { ...table("1.00000000"), XOF: "" } as RateTable;
    const provider = createRateProvider([
      source("a", async () => partial),
      source("b", async () => table("5.00000000")),
    ]);
    expect((await provider.getRate("XOF")).source).toBe("b");
  });

  it("throws a clear error when every source fails", async () => {
    const provider = createRateProvider([source("a", async () => Promise.reject(new Error("x")))]);
    await expect(provider.getRate("NGN")).rejects.toBeInstanceOf(RateUnavailableError);
  });

  it("caches for 60 seconds and then refreshes", async () => {
    let time = 0;
    const fetchRates = vi.fn(async () => table("1.00000000"));
    const provider = createRateProvider([source("a", fetchRates)], () => time);
    await provider.getRate("NGN");
    time = 59_999;
    await provider.getRate("KES");
    expect(fetchRates).toHaveBeenCalledTimes(1);
    time = 60_000;
    await provider.getRate("GHS");
    expect(fetchRates).toHaveBeenCalledTimes(2);
  });

  it("makes one call for simultaneous requests", async () => {
    const fetchRates = vi.fn(async () => table("1.00000000"));
    const provider = createRateProvider([source("a", fetchRates)]);
    await Promise.all([provider.getRate("NGN"), provider.getRate("USD"), provider.getRate("EUR")]);
    expect(fetchRates).toHaveBeenCalledTimes(1);
  });
});

describe("response parsing", () => {
  const coingecko = {
    bitcoin: {
      ngn: 104242478.05,
      kes: 9976791.04,
      ghs: 913807.42,
      zar: 1261087.58,
      xof: 44569823.49,
      usd: 75652.19,
      eur: 67959.95,
      gbp: 56659.86,
    },
  };

  it("reads a CoinGecko body", () => {
    expect(parseCoingeckoResponse(coingecko).NGN).toBe("104242478.05000000");
  });

  it("rejects a CoinGecko body with a missing or zero rate", () => {
    expect(() => parseCoingeckoResponse({ bitcoin: { ...coingecko.bitcoin, xof: 0 } })).toThrow();
    expect(() => parseCoingeckoResponse({})).toThrow();
  });

  it("reads a Yadio body in upper case", () => {
    const body = {
      BTC: { NGN: 1, KES: 2, GHS: 3, ZAR: 4, XOF: 5, USD: 6, EUR: 7, GBP: 8, AED: 9 },
    };
    expect(parseYadioResponse(body).XOF).toBe("5.00000000");
    expect(() => parseYadioResponse({ BTC: { NGN: 1 } })).toThrow();
  });
});

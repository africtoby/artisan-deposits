import { describe, expect, it } from "vitest";
import { FakeWalletProvider } from "./fake-wallet-provider";
import { createReceiveInvoice, loadWalletOverview, receiveAmountFromFiat } from "./receive";
import type { MakeInvoiceInput, WalletInvoice } from "./wallet-provider";

// 1 NGN is exactly 1 sat at this rate, which keeps the arithmetic easy to read.
const RATE = "100000000.00000000";

describe("receiveAmountFromFiat", () => {
  it("turns an amount in the seller's currency into sats", () => {
    expect(receiveAmountFromFiat(" 2,500 ", "NGN", RATE)).toEqual({
      ok: true,
      sats: 2500n,
      fiatMinor: 250_000n,
    });
  });

  it("accepts decimals the currency has, and rounds sats up", () => {
    expect(receiveAmountFromFiat("12.50", "USD", "100000")).toMatchObject({
      ok: true,
      fiatMinor: 1250n,
      sats: 12_500n,
    });
  });

  it.each(["", "   ", "0", "0.00", "-5", "1e3", "abc", "1.234", "99999999999999999999999"])(
    "rejects %j for NGN",
    (raw) => {
      expect(receiveAmountFromFiat(raw, "NGN", RATE).ok).toBe(false);
    },
  );

  it("rejects decimals for a currency without any", () => {
    expect(receiveAmountFromFiat("10.5", "XOF", RATE)).toMatchObject({ ok: false });
  });

  it("rejects an amount over the sats limit", () => {
    expect(receiveAmountFromFiat("1000000", "NGN", RATE)).toMatchObject({ ok: true });
    expect(receiveAmountFromFiat("1000001", "NGN", RATE)).toMatchObject({ ok: false });
  });

  it("rejects a value that is not text", () => {
    expect(receiveAmountFromFiat(null, "NGN", RATE).ok).toBe(false);
    expect(receiveAmountFromFiat(100, "NGN", RATE).ok).toBe(false);
  });
});

describe("createReceiveInvoice", () => {
  it("makes an invoice for the asked amount", async () => {
    const invoice = await createReceiveInvoice(new FakeWalletProvider(), 321n);
    expect(invoice.amountSats).toBe(321n);
  });

  it("refuses an invoice for a different amount", async () => {
    class WrongAmount extends FakeWalletProvider {
      override async makeInvoice(input: MakeInvoiceInput): Promise<WalletInvoice> {
        return super.makeInvoice({ ...input, amountSats: input.amountSats + 1n });
      }
    }
    await expect(createReceiveInvoice(new WrongAmount(), 100n)).rejects.toThrow("wrong amount");
  });
});

describe("loadWalletOverview", () => {
  it("returns the balance and newest transactions", async () => {
    const wallet = new FakeWalletProvider(500n);
    const invoice = await createReceiveInvoice(wallet, 100n);
    wallet.simulatePayment(invoice.paymentHash);
    const overview = await loadWalletOverview(wallet);
    expect(overview.balanceSats).toBe(600n);
    expect(overview.transactions).toHaveLength(1);
    expect(overview.info.network).toBe("regtest");
  });
});

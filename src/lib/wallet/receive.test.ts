import { describe, expect, it } from "vitest";
import { FakeWalletProvider } from "./fake-wallet-provider";
import { createReceiveInvoice, loadWalletOverview, parseReceiveAmount } from "./receive";
import type { MakeInvoiceInput, WalletInvoice } from "./wallet-provider";

describe("parseReceiveAmount", () => {
  it("accepts whole sats", () => {
    expect(parseReceiveAmount(" 2500 ")).toEqual({ ok: true, sats: 2500n });
  });

  it.each(["", "0", "-5", "1.5", "1e3", "abc", "1000001", "12345678"])("rejects %j", (raw) => {
    expect(parseReceiveAmount(raw).ok).toBe(false);
  });

  it("rejects a value that is not text", () => {
    expect(parseReceiveAmount(null).ok).toBe(false);
    expect(parseReceiveAmount(100).ok).toBe(false);
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

import { describe, expect, it } from "vitest";
import { WalletError } from "@/lib/wallet/wallet-provider";
import { DemoWalletProvider, MemoryDemoWalletStore } from "./demo-wallet";

function setup() {
  let now = new Date("2026-11-10T10:00:00Z");
  const clock = () => now;
  const store = new MemoryDemoWalletStore(clock);
  const wallet = new DemoWalletProvider(store, clock);
  return { wallet, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

const invoice = { amountSats: 5_000n, description: "Deposit", expirySeconds: 900 };

describe("DemoWalletProvider", () => {
  it("reports a test network so the TEST COINS label shows", async () => {
    const { wallet } = setup();
    expect((await wallet.getInfo()).network).toBe("regtest");
  });

  it("makes a pending invoice that is clearly not real", async () => {
    const { wallet } = setup();
    const made = await wallet.makeInvoice(invoice);
    expect(made.bolt11.startsWith("lndemo")).toBe(true);
    expect((await wallet.lookupInvoice(made.paymentHash)).state).toBe("pending");
  });

  it("settles once and adds to the balance once", async () => {
    const { wallet } = setup();
    const made = await wallet.makeInvoice(invoice);
    expect(await wallet.simulatePayment(made.paymentHash)).toBe(true);
    expect(await wallet.simulatePayment(made.paymentHash)).toBe(false);
    expect((await wallet.lookupInvoice(made.paymentHash)).state).toBe("settled");
    expect(await wallet.getBalanceSats()).toBe(5_000n);
  });

  it("cannot be paid after it expires", async () => {
    const { wallet, advance } = setup();
    const made = await wallet.makeInvoice(invoice);
    advance(901_000);
    expect(await wallet.simulatePayment(made.paymentHash)).toBe(false);
    expect((await wallet.lookupInvoice(made.paymentHash)).state).toBe("expired");
    expect(await wallet.getBalanceSats()).toBe(0n);
  });

  it("rejects an unknown invoice", async () => {
    const { wallet } = setup();
    await expect(wallet.lookupInvoice("nope")).rejects.toBeInstanceOf(WalletError);
  });

  it("lists newest first", async () => {
    const { wallet, advance } = setup();
    const first = await wallet.makeInvoice(invoice);
    advance(1000);
    const second = await wallet.makeInvoice(invoice);
    const list = await wallet.listTransactions(10);
    expect(list.map((tx) => tx.paymentHash)).toEqual([second.paymentHash, first.paymentHash]);
  });
});

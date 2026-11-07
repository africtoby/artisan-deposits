import { randomBytes } from "node:crypto";
import {
  WalletError,
  type InvoiceStatus,
  type MakeInvoiceInput,
  type WalletInfo,
  type WalletInvoice,
  type WalletProvider,
  type WalletTransaction,
} from "./wallet-provider";

type StoredInvoice = {
  invoice: WalletInvoice;
  description: string;
  createdAt: Date;
  settledAt: Date | null;
};

// In-memory wallet for unit tests, the Playwright test and judge mode. It moves no real money.
export class FakeWalletProvider implements WalletProvider {
  private balance: bigint;
  private readonly invoices = new Map<string, StoredInvoice>();

  constructor(
    startingBalanceSats = 0n,
    private readonly info: WalletInfo = {
      alias: "Practice wallet",
      network: "regtest",
      methods: ["get_info", "get_balance", "make_invoice", "lookup_invoice", "list_transactions"],
    },
  ) {
    this.balance = startingBalanceSats;
  }

  async getInfo(): Promise<WalletInfo> {
    return this.info;
  }

  async getBalanceSats(): Promise<bigint> {
    return this.balance;
  }

  async makeInvoice(input: MakeInvoiceInput): Promise<WalletInvoice> {
    const paymentHash = randomBytes(32).toString("hex");
    const now = new Date();
    const invoice: WalletInvoice = {
      bolt11: `lnbcfake${input.amountSats}n1${paymentHash.slice(0, 40)}`,
      paymentHash,
      amountSats: input.amountSats,
      expiresAt: new Date(now.getTime() + input.expirySeconds * 1000),
    };
    this.invoices.set(paymentHash, {
      invoice,
      description: input.description,
      createdAt: now,
      settledAt: null,
    });
    return invoice;
  }

  async lookupInvoice(paymentHash: string): Promise<InvoiceStatus> {
    const stored = this.invoices.get(paymentHash);
    if (!stored) throw new WalletError("Invoice not found.", "rejected");
    if (stored.settledAt) return { state: "settled", settledAt: stored.settledAt };
    if (stored.invoice.expiresAt.getTime() <= Date.now())
      return { state: "expired", settledAt: null };
    return { state: "pending", settledAt: null };
  }

  async listTransactions(limit: number): Promise<WalletTransaction[]> {
    return [...this.invoices.values()]
      .map((stored): WalletTransaction => ({
        paymentHash: stored.invoice.paymentHash,
        direction: "incoming",
        state: stored.settledAt ? "settled" : "pending",
        amountSats: stored.invoice.amountSats,
        description: stored.description,
        createdAt: stored.createdAt,
        settledAt: stored.settledAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  close(): void {}

  // Test helper standing in for a client paying from another wallet. Paying twice is a no-op,
  // like a real invoice, which can only be settled once.
  simulatePayment(paymentHash: string): void {
    const stored = this.invoices.get(paymentHash);
    if (!stored) throw new WalletError("Invoice not found.", "rejected");
    if (stored.settledAt) return;
    stored.settledAt = new Date();
    this.balance += stored.invoice.amountSats;
  }
}

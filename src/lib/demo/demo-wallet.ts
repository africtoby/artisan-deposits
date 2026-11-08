import { randomBytes } from "node:crypto";
import {
  WalletError,
  type InvoiceStatus,
  type MakeInvoiceInput,
  type WalletInfo,
  type WalletInvoice,
  type WalletProvider,
  type WalletTransaction,
} from "@/lib/wallet/wallet-provider";

export type DemoInvoiceRow = {
  paymentHash: string;
  amountSats: bigint;
  description: string;
  expiresAt: Date;
  settledAt: Date | null;
  createdAt: Date;
};

// Storage for one demo seller's practice invoices. A database in production and a plain list in
// tests, so the wallet rules below can be tested without a database.
export interface DemoWalletStore {
  insert(row: Omit<DemoInvoiceRow, "settledAt" | "createdAt">): Promise<DemoInvoiceRow>;
  find(paymentHash: string): Promise<DemoInvoiceRow | null>;
  // Newest first.
  list(limit: number): Promise<DemoInvoiceRow[]>;
  // Guarded: settles only a row that is still unsettled and unexpired. False if it did not change.
  settle(paymentHash: string, at: Date): Promise<boolean>;
  sumSettled(): Promise<bigint>;
}

// Practice wallet for judge mode. It moves no money, reports a test network so every screen
// shows the TEST COINS label, and, like the real receive-only link, it has no way to pay out.
export class DemoWalletProvider implements WalletProvider {
  constructor(
    private readonly store: DemoWalletStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getInfo(): Promise<WalletInfo> {
    return {
      alias: "Practice wallet",
      network: "regtest",
      methods: ["get_info", "get_balance", "make_invoice", "lookup_invoice", "list_transactions"],
    };
  }

  async getBalanceSats(): Promise<bigint> {
    return this.store.sumSettled();
  }

  async makeInvoice(input: MakeInvoiceInput): Promise<WalletInvoice> {
    const paymentHash = randomBytes(32).toString("hex");
    const expiresAt = new Date(this.now().getTime() + input.expirySeconds * 1000);
    await this.store.insert({
      paymentHash,
      amountSats: input.amountSats,
      description: input.description,
      expiresAt,
    });
    return {
      // Not a payable invoice on purpose: the "lndemo" prefix cannot be mistaken for real coins.
      bolt11: `lndemo${input.amountSats}n1${paymentHash.slice(0, 40)}`,
      paymentHash,
      amountSats: input.amountSats,
      expiresAt,
    };
  }

  async lookupInvoice(paymentHash: string): Promise<InvoiceStatus> {
    const row = await this.store.find(paymentHash);
    if (!row) throw new WalletError("Invoice not found.", "rejected");
    if (row.settledAt) return { state: "settled", settledAt: row.settledAt };
    if (row.expiresAt.getTime() <= this.now().getTime())
      return { state: "expired", settledAt: null };
    return { state: "pending", settledAt: null };
  }

  async listTransactions(limit: number): Promise<WalletTransaction[]> {
    const rows = await this.store.list(limit);
    return rows.map((row): WalletTransaction => ({
      paymentHash: row.paymentHash,
      direction: "incoming",
      state: row.settledAt ? "settled" : "pending",
      amountSats: row.amountSats,
      description: row.description,
      createdAt: row.createdAt,
      settledAt: row.settledAt,
    }));
  }

  close(): void {}

  // Stands in for the client paying from their own wallet. Paying twice or after expiry does
  // nothing, like a real invoice.
  async simulatePayment(paymentHash: string): Promise<boolean> {
    return this.store.settle(paymentHash, this.now());
  }
}

// Test double for DemoWalletStore.
export class MemoryDemoWalletStore implements DemoWalletStore {
  rows = new Map<string, DemoInvoiceRow>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async insert(row: Omit<DemoInvoiceRow, "settledAt" | "createdAt">): Promise<DemoInvoiceRow> {
    const saved = { ...row, settledAt: null, createdAt: this.now() };
    this.rows.set(row.paymentHash, saved);
    return saved;
  }

  async find(paymentHash: string): Promise<DemoInvoiceRow | null> {
    return this.rows.get(paymentHash) ?? null;
  }

  async list(limit: number): Promise<DemoInvoiceRow[]> {
    return [...this.rows.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async settle(paymentHash: string, at: Date): Promise<boolean> {
    const row = this.rows.get(paymentHash);
    if (!row || row.settledAt || row.expiresAt.getTime() <= at.getTime()) return false;
    row.settledAt = at;
    return true;
  }

  async sumSettled(): Promise<bigint> {
    let total = 0n;
    for (const row of this.rows.values()) if (row.settledAt) total += row.amountSats;
    return total;
  }
}

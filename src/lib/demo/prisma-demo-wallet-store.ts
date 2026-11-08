import "server-only";
import { getDb } from "@/lib/db";
import type { DemoInvoiceRow, DemoWalletStore } from "./demo-wallet";

// Every query is filtered by sellerId, so one demo seller can never see or settle another's.
export class PrismaDemoWalletStore implements DemoWalletStore {
  constructor(private readonly sellerId: string) {}

  async insert(row: Omit<DemoInvoiceRow, "settledAt" | "createdAt">): Promise<DemoInvoiceRow> {
    return getDb().demoWalletInvoice.create({ data: { ...row, sellerId: this.sellerId } });
  }

  async find(paymentHash: string): Promise<DemoInvoiceRow | null> {
    return getDb().demoWalletInvoice.findFirst({
      where: { paymentHash, sellerId: this.sellerId },
    });
  }

  async list(limit: number): Promise<DemoInvoiceRow[]> {
    return getDb().demoWalletInvoice.findMany({
      where: { sellerId: this.sellerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async settle(paymentHash: string, at: Date): Promise<boolean> {
    // One guarded update: only an unsettled, unexpired invoice can flip, and only once.
    const result = await getDb().demoWalletInvoice.updateMany({
      where: {
        paymentHash,
        sellerId: this.sellerId,
        settledAt: null,
        expiresAt: { gt: at },
      },
      data: { settledAt: at },
    });
    return result.count === 1;
  }

  async sumSettled(): Promise<bigint> {
    const total = await getDb().demoWalletInvoice.aggregate({
      where: { sellerId: this.sellerId, settledAt: { not: null } },
      _sum: { amountSats: true },
    });
    return total._sum.amountSats ?? 0n;
  }
}

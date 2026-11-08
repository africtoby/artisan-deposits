import "server-only";
import type { Invoice, Job } from "@/generated/prisma/client";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { EventActor, InvoicePurpose, JobStatus } from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import { isCurrencyCode, type CurrencyCode } from "@/lib/money/currencies";
import type {
  EventRecord,
  InvoiceRecord,
  JobRecord,
  JobStore,
  NewInvoice,
  NewJob,
} from "./job-store";

type Client = PrismaClient | Prisma.TransactionClient;

function currencyOf(code: string): CurrencyCode {
  // A bad value here means the database holds something the app never wrote.
  if (!isCurrencyCode(code)) throw new Error(`Unknown currency in database: ${code}`);
  return code;
}

function toJob(row: Job): JobRecord {
  return {
    id: row.id,
    sellerId: row.sellerId,
    clientName: row.clientName,
    title: row.title,
    currency: currencyOf(row.currency),
    priceMinor: row.priceMinor,
    depositMinor: row.depositMinor,
    status: row.status,
    publicToken: row.publicToken,
    deliveryUrl: row.deliveryUrl,
  };
}

function toInvoice(row: Invoice): InvoiceRecord {
  return {
    id: row.id,
    jobId: row.jobId,
    purpose: row.purpose,
    bolt11: row.bolt11,
    paymentHash: row.paymentHash,
    amountSats: row.amountSats,
    fiatMinor: row.fiatMinor,
    currency: currencyOf(row.currency),
    rateUsed: row.rateUsed.toFixed(8),
    expiresAt: row.expiresAt,
    status: row.status,
    paidAt: row.paidAt,
  };
}

export class PrismaJobStore implements JobStore {
  // `root` is set only on the outermost store, which is the one allowed to open a transaction.
  private constructor(
    private readonly client: Client,
    private readonly root: PrismaClient | null,
  ) {}

  static create(): PrismaJobStore {
    const db = getDb();
    return new PrismaJobStore(db, db);
  }

  async transaction<T>(work: (store: JobStore) => Promise<T>): Promise<T> {
    if (!this.root) return work(this);
    return this.root.$transaction((tx) => work(new PrismaJobStore(tx, null)));
  }

  async createJob(job: NewJob): Promise<JobRecord> {
    const row = await this.client.job.create({
      data: {
        sellerId: job.sellerId,
        clientName: job.clientName,
        title: job.title,
        details: { notes: job.details },
        deadline: job.deadline ? new Date(`${job.deadline}T00:00:00Z`) : null,
        currency: job.currency,
        priceMinor: job.priceMinor,
        depositMinor: job.depositMinor,
        publicToken: job.publicToken,
        events: { create: { toStatus: "created", actor: "seller" } },
      },
    });
    return toJob(row);
  }

  async findJobById(id: string): Promise<JobRecord | null> {
    const row = await this.client.job.findUnique({ where: { id } });
    return row ? toJob(row) : null;
  }

  async findJobByToken(token: string): Promise<JobRecord | null> {
    const row = await this.client.job.findUnique({ where: { publicToken: token } });
    return row ? toJob(row) : null;
  }

  async listEvents(jobId: string): Promise<EventRecord[]> {
    return this.client.jobEvent.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
      select: { fromStatus: true, toStatus: true, actor: true, createdAt: true },
    });
  }

  async setDeliveryUrl(jobId: string, url: string): Promise<void> {
    await this.client.job.update({ where: { id: jobId }, data: { deliveryUrl: url } });
  }

  async findInvoiceByPaymentHash(paymentHash: string): Promise<InvoiceRecord | null> {
    const row = await this.client.invoice.findUnique({ where: { paymentHash } });
    return row ? toInvoice(row) : null;
  }

  async findPendingInvoice(jobId: string, purpose: InvoicePurpose): Promise<InvoiceRecord | null> {
    const row = await this.client.invoice.findFirst({
      where: { jobId, purpose, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    return row ? toInvoice(row) : null;
  }

  async expirePendingInvoices(
    jobId: string,
    purpose: InvoicePurpose,
    before: Date,
  ): Promise<number> {
    const result = await this.client.invoice.updateMany({
      where: { jobId, purpose, status: "pending", expiresAt: { lte: before } },
      data: { status: "expired" },
    });
    return result.count;
  }

  async insertInvoice(invoice: NewInvoice): Promise<InvoiceRecord> {
    const row = await this.client.invoice.create({ data: invoice });
    return toInvoice(row);
  }

  async moveJob(
    jobId: string,
    from: JobStatus,
    to: JobStatus,
    actor: EventActor,
    note?: string,
  ): Promise<boolean> {
    // The status change and its timeline row succeed or fail together.
    return this.transaction(async (store) => {
      const { client } = store as PrismaJobStore;
      const result = await client.job.updateMany({
        where: { id: jobId, status: from },
        data: { status: to },
      });
      if (result.count === 0) return false;
      await client.jobEvent.create({
        data: { jobId, fromStatus: from, toStatus: to, actor, note: note ?? null },
      });
      return true;
    });
  }

  async claimInvoicePaid(paymentHash: string, paidAt: Date): Promise<InvoiceRecord | null> {
    // The WHERE clause is the guard: of two simultaneous calls, the database lets only one match.
    const result = await this.client.invoice.updateMany({
      where: { paymentHash, status: { in: ["pending", "expired"] } },
      data: { status: "paid", paidAt },
    });
    if (result.count === 0) return null;
    return this.findInvoiceByPaymentHash(paymentHash);
  }
}

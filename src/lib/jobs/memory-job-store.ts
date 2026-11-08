import { randomUUID } from "node:crypto";
import type { EventActor, InvoicePurpose, JobStatus } from "@/generated/prisma/enums";
import type {
  EventRecord,
  InvoiceRecord,
  JobRecord,
  JobStore,
  NewInvoice,
  NewJob,
} from "./job-store";

export type RecordedEvent = {
  jobId: string;
  at?: Date;
  from: JobStatus | null;
  to: JobStatus;
  actor: EventActor;
  note: string | null;
};

// In-memory store for unit tests. It follows the same rules as the database: a unique payment
// hash, guarded updates, and a transaction that undoes everything if the work throws.
export class MemoryJobStore implements JobStore {
  jobs = new Map<string, JobRecord>();
  invoices = new Map<string, InvoiceRecord>();
  events: RecordedEvent[] = [];

  async createJob(job: NewJob): Promise<JobRecord> {
    const record: JobRecord = {
      id: randomUUID(),
      sellerId: job.sellerId,
      clientName: job.clientName,
      title: job.title,
      currency: job.currency,
      priceMinor: job.priceMinor,
      depositMinor: job.depositMinor,
      status: "created",
      publicToken: job.publicToken,
      deliveryUrl: null,
    };
    this.jobs.set(record.id, record);
    this.events.push({
      jobId: record.id,
      at: new Date(),
      from: null,
      to: "created",
      actor: "seller",
      note: null,
    });
    return { ...record };
  }

  async findJobById(id: string): Promise<JobRecord | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async findJobByToken(token: string): Promise<JobRecord | null> {
    for (const job of this.jobs.values()) if (job.publicToken === token) return { ...job };
    return null;
  }

  async listEvents(jobId: string): Promise<EventRecord[]> {
    return this.events
      .filter((event) => event.jobId === jobId)
      .map((event) => ({
        fromStatus: event.from,
        toStatus: event.to,
        actor: event.actor,
        createdAt: event.at ?? new Date(0),
      }));
  }

  async setDeliveryUrl(jobId: string, url: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) job.deliveryUrl = url;
  }

  async findInvoiceByPaymentHash(paymentHash: string): Promise<InvoiceRecord | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.paymentHash === paymentHash) return { ...invoice };
    }
    return null;
  }

  async findPendingInvoice(jobId: string, purpose: InvoicePurpose): Promise<InvoiceRecord | null> {
    const pending = [...this.invoices.values()].filter(
      (invoice) =>
        invoice.jobId === jobId && invoice.purpose === purpose && invoice.status === "pending",
    );
    const newest = pending[pending.length - 1];
    return newest ? { ...newest } : null;
  }

  async expirePendingInvoices(
    jobId: string,
    purpose: InvoicePurpose,
    before: Date,
  ): Promise<number> {
    let changed = 0;
    for (const invoice of this.invoices.values()) {
      if (
        invoice.jobId === jobId &&
        invoice.purpose === purpose &&
        invoice.status === "pending" &&
        invoice.expiresAt.getTime() <= before.getTime()
      ) {
        invoice.status = "expired";
        changed += 1;
      }
    }
    return changed;
  }

  async insertInvoice(invoice: NewInvoice): Promise<InvoiceRecord> {
    for (const existing of this.invoices.values()) {
      if (existing.paymentHash === invoice.paymentHash) {
        throw new Error("Unique constraint failed on payment_hash.");
      }
    }
    const record: InvoiceRecord = { ...invoice, id: randomUUID(), status: "pending", paidAt: null };
    this.invoices.set(record.id, record);
    return { ...record };
  }

  async moveJob(
    jobId: string,
    from: JobStatus,
    to: JobStatus,
    actor: EventActor,
    note?: string,
  ): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== from) return false;
    job.status = to;
    this.events.push({ jobId, at: new Date(), from, to, actor, note: note ?? null });
    return true;
  }

  async claimInvoicePaid(paymentHash: string, paidAt: Date): Promise<InvoiceRecord | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.paymentHash !== paymentHash) continue;
      if (invoice.status === "paid") return null;
      invoice.status = "paid";
      invoice.paidAt = paidAt;
      return { ...invoice };
    }
    return null;
  }

  async transaction<T>(work: (store: JobStore) => Promise<T>): Promise<T> {
    const snapshot = {
      jobs: new Map([...this.jobs].map(([id, job]) => [id, { ...job }])),
      invoices: new Map([...this.invoices].map(([id, invoice]) => [id, { ...invoice }])),
      events: [...this.events],
    };
    try {
      return await work(this);
    } catch (error) {
      this.jobs = snapshot.jobs;
      this.invoices = snapshot.invoices;
      this.events = snapshot.events;
      throw error;
    }
  }
}

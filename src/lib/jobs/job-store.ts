import type {
  EventActor,
  InvoicePurpose,
  InvoiceStatus,
  JobStatus,
} from "@/generated/prisma/enums";
import type { CurrencyCode } from "@/lib/money/currencies";

export type JobRecord = {
  id: string;
  sellerId: string;
  clientName: string;
  title: string;
  currency: CurrencyCode;
  priceMinor: bigint;
  depositMinor: bigint;
  status: JobStatus;
  publicToken: string;
};

export type InvoiceRecord = {
  id: string;
  jobId: string;
  purpose: InvoicePurpose;
  bolt11: string;
  paymentHash: string;
  amountSats: bigint;
  fiatMinor: bigint;
  currency: CurrencyCode;
  // Fiat per 1 BTC at creation, as decimal text. Never changes after the invoice is made.
  rateUsed: string;
  expiresAt: Date;
  status: InvoiceStatus;
  paidAt: Date | null;
};

export type NewJob = {
  sellerId: string;
  clientName: string;
  title: string;
  details: string;
  deadline: string | null;
  currency: CurrencyCode;
  priceMinor: bigint;
  depositMinor: bigint;
  publicToken: string;
};

export type NewInvoice = Omit<InvoiceRecord, "id" | "status" | "paidAt">;

// Everything the job logic needs from storage. The Prisma version is the real one; the in-memory
// version lets us unit test the money and payment rules without a database.
export interface JobStore {
  createJob(job: NewJob): Promise<JobRecord>;
  findJobById(id: string): Promise<JobRecord | null>;
  findJobByToken(token: string): Promise<JobRecord | null>;
  findInvoiceByPaymentHash(paymentHash: string): Promise<InvoiceRecord | null>;
  // The newest invoice for this job and purpose that is still waiting for payment.
  findPendingInvoice(jobId: string, purpose: InvoicePurpose): Promise<InvoiceRecord | null>;
  // Marks pending invoices as expired. Returns how many changed.
  expirePendingInvoices(jobId: string, purpose: InvoicePurpose, before: Date): Promise<number>;
  insertInvoice(invoice: NewInvoice): Promise<InvoiceRecord>;
  // Guarded move: changes the status only if it is still `from`, and writes the timeline event
  // in the same step. Returns false when someone else already moved it.
  moveJob(
    jobId: string,
    from: JobStatus,
    to: JobStatus,
    actor: EventActor,
    note?: string,
  ): Promise<boolean>;
  // Guarded update: pending or expired becomes paid exactly once. Returns the invoice only for the
  // call that made the change; every later call gets null.
  claimInvoicePaid(paymentHash: string, paidAt: Date): Promise<InvoiceRecord | null>;
  // Runs several steps as one all-or-nothing unit.
  transaction<T>(work: (store: JobStore) => Promise<T>): Promise<T>;
}

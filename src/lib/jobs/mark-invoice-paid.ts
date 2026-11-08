import type { JobStatus } from "@/generated/prisma/enums";
import type { InvoiceRecord, JobStore } from "./job-store";

export type MarkPaidResult =
  | { changed: true; invoice: InvoiceRecord; jobMoved: boolean }
  // Already recorded, or not one of our invoices. Safe to call again and again.
  | { changed: false };

// Where a job goes when each kind of invoice is paid.
const AFTER_PAYMENT = {
  deposit: { from: "deposit_pending", to: "deposit_paid", note: "Deposit paid" },
  balance: { from: "balance_pending", to: "completed", note: "Balance paid" },
} as const satisfies Record<string, { from: JobStatus; to: JobStatus; note: string }>;

// The caller must already have confirmed with the wallet that this payment settled.
// Safe to run twice, or from two requests at once: only the call that flips the invoice from
// pending to paid goes on to move the job, and the database will not hold two invoices with the
// same payment hash. The job move is guarded too, so a cancelled job is never pushed forward;
// its payment is still recorded because the money really arrived.
export async function markInvoicePaid(
  store: JobStore,
  paymentHash: string,
  paidAt: Date = new Date(),
): Promise<MarkPaidResult> {
  return store.transaction(async (tx) => {
    const invoice = await tx.claimInvoicePaid(paymentHash, paidAt);
    if (!invoice) return { changed: false };
    const step = AFTER_PAYMENT[invoice.purpose];
    const jobMoved = await tx.moveJob(invoice.jobId, step.from, step.to, "system", step.note);
    return { changed: true, invoice, jobMoved };
  });
}

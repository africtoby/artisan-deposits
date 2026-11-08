import type { InvoicePurpose, JobStatus } from "@/generated/prisma/enums";
import { createInvoice, type CreateInvoiceDeps } from "./create-invoice";
import { markInvoicePaid } from "./mark-invoice-paid";

// What the client page is told about a payment. Plain strings only, so it can cross to the
// browser as JSON. It holds nothing about the seller or the wallet.
export type ClientPaymentState =
  | {
      kind: "open";
      purpose: InvoicePurpose;
      bolt11: string;
      amountSats: string;
      fiatMinor: string;
      currency: string;
      expiresAt: string;
    }
  | { kind: "paid" }
  | { kind: "cancelled" }
  // Nothing is due right now, for example while the seller is still working.
  | { kind: "none" };

// The status in which a client may be asked to pay each kind of invoice.
const PAYABLE: Record<InvoicePurpose, JobStatus[]> = {
  deposit: ["created", "deposit_pending"],
  balance: ["balance_pending"],
};

// Statuses that come after the payment point, meaning it must already have been paid.
const PAST_PAYMENT: Record<InvoicePurpose, JobStatus[]> = {
  deposit: ["deposit_paid", "in_progress", "ready", "balance_pending", "completed"],
  balance: ["completed"],
};

// One step of the client's polling: check the wallet for the open invoice, record the payment if
// it landed, and make a fresh invoice when the old one ran out. The client page calls this every
// few seconds, so every branch has to be safe to repeat.
export async function refreshPayment(
  deps: CreateInvoiceDeps,
  jobId: string,
  purpose: InvoicePurpose,
): Promise<ClientPaymentState> {
  const { store, wallet } = deps;
  const now = (deps.now ?? (() => new Date()))();

  const job = await store.findJobById(jobId);
  if (!job || job.status === "cancelled") return { kind: "cancelled" };
  if (PAST_PAYMENT[purpose].includes(job.status)) return { kind: "paid" };
  if (!PAYABLE[purpose].includes(job.status)) return { kind: "none" };

  const pending = await store.findPendingInvoice(job.id, purpose);
  if (pending) {
    // Asked even after the clock ran out: a payment that landed in the last second still counts.
    const found = await wallet.lookupInvoice(pending.paymentHash);
    if (found.state === "settled") {
      await markInvoicePaid(store, pending.paymentHash, found.settledAt ?? now);
      return { kind: "paid" };
    }
    if (pending.expiresAt.getTime() > now.getTime()) return open(pending);
  }

  return open(await createInvoice(deps, job.id, purpose));
}

function open(invoice: {
  purpose: InvoicePurpose;
  bolt11: string;
  amountSats: bigint;
  fiatMinor: bigint;
  currency: string;
  expiresAt: Date;
}): ClientPaymentState {
  return {
    kind: "open",
    purpose: invoice.purpose,
    bolt11: invoice.bolt11,
    amountSats: invoice.amountSats.toString(),
    fiatMinor: invoice.fiatMinor.toString(),
    currency: invoice.currency,
    expiresAt: invoice.expiresAt.toISOString(),
  };
}

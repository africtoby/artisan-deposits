import { markInvoicePaid } from "./mark-invoice-paid";
import { createInvoice, type CreateInvoiceDeps } from "./create-invoice";

// What the client page is told. Plain strings and numbers only, so it can cross to the browser
// as JSON. It holds nothing about the seller or the wallet.
export type ClientDepositState =
  | {
      kind: "open";
      bolt11: string;
      amountSats: string;
      fiatMinor: string;
      currency: string;
      expiresAt: string;
    }
  | { kind: "paid" }
  | { kind: "cancelled" };

// One step of the client's polling: check the wallet for the open deposit invoice, record the
// payment if it landed, and make a fresh invoice when the old one ran out. The client page calls
// this every few seconds, so every branch has to be safe to repeat.
export async function refreshDeposit(
  deps: CreateInvoiceDeps,
  jobId: string,
): Promise<ClientDepositState> {
  const { store, wallet } = deps;
  const now = (deps.now ?? (() => new Date()))();

  const job = await store.findJobById(jobId);
  if (!job) return { kind: "cancelled" };
  if (job.status === "cancelled") return { kind: "cancelled" };
  if (job.status !== "created" && job.status !== "deposit_pending") return { kind: "paid" };

  const pending = await store.findPendingInvoice(job.id, "deposit");
  if (pending) {
    // Asked even after the clock ran out: a payment that landed in the last second still counts.
    const found = await wallet.lookupInvoice(pending.paymentHash);
    if (found.state === "settled") {
      await markInvoicePaid(store, pending.paymentHash, found.settledAt ?? now);
      return { kind: "paid" };
    }
    if (pending.expiresAt.getTime() > now.getTime()) return open(pending);
  }

  return open(await createInvoice(deps, job.id, "deposit"));
}

function open(invoice: {
  bolt11: string;
  amountSats: bigint;
  fiatMinor: bigint;
  currency: string;
  expiresAt: Date;
}): ClientDepositState {
  return {
    kind: "open",
    bolt11: invoice.bolt11,
    amountSats: invoice.amountSats.toString(),
    fiatMinor: invoice.fiatMinor.toString(),
    currency: invoice.currency,
    expiresAt: invoice.expiresAt.toISOString(),
  };
}

import type { InvoicePurpose, JobStatus } from "@/generated/prisma/enums";
import { fiatToSats } from "@/lib/money/convert";
import type { RateLookup } from "@/lib/rates/rate-provider";
import type { CurrencyCode } from "@/lib/money/currencies";
import type { WalletProvider } from "@/lib/wallet/wallet-provider";
import type { InvoiceRecord, JobStore } from "./job-store";
import { assertMove } from "./status-machine";

export const INVOICE_LIFETIME_SECONDS = 15 * 60;

export class InvoiceError extends Error {
  constructor(
    message: string,
    readonly code: "not-found" | "wrong-status" | "nothing-to-pay" | "wallet-mismatch",
  ) {
    super(message);
    this.name = "InvoiceError";
  }
}

export type CreateInvoiceDeps = {
  store: JobStore;
  wallet: WalletProvider;
  getRate: (currency: CurrencyCode) => Promise<RateLookup>;
  now?: () => Date;
};

// Which statuses allow a new invoice of each kind.
const ALLOWED_STATUSES: Record<InvoicePurpose, JobStatus[]> = {
  deposit: ["created", "deposit_pending"],
  balance: ["ready", "balance_pending"],
};

// Everything is worked out here from the stored job. Callers pass only the job id and the purpose,
// so a price or currency sent from the browser can never reach an invoice.
export async function createInvoice(
  deps: CreateInvoiceDeps,
  jobId: string,
  purpose: InvoicePurpose,
): Promise<InvoiceRecord> {
  const { store, wallet, getRate } = deps;
  const now = (deps.now ?? (() => new Date()))();

  const job = await store.findJobById(jobId);
  if (!job) throw new InvoiceError("Job not found.", "not-found");
  if (!ALLOWED_STATUSES[purpose].includes(job.status)) {
    throw new InvoiceError(
      `A ${purpose} invoice cannot be made while the job is ${job.status}.`,
      "wrong-status",
    );
  }

  const fiatMinor = purpose === "deposit" ? job.depositMinor : job.priceMinor - job.depositMinor;
  if (fiatMinor <= 0n) throw new InvoiceError("There is nothing left to pay.", "nothing-to-pay");

  // A client who reloads or double taps gets the same open invoice, not a pile of new ones.
  const open = await store.findPendingInvoice(job.id, purpose);
  if (open && open.expiresAt.getTime() > now.getTime()) return open;
  await store.expirePendingInvoices(job.id, purpose, now);

  const { rate } = await getRate(job.currency);
  const amountSats = fiatToSats(fiatMinor, job.currency, rate);
  if (amountSats < 1n)
    throw new InvoiceError("That amount is too small to invoice.", "nothing-to-pay");

  const made = await wallet.makeInvoice({
    amountSats,
    description: `${purpose === "deposit" ? "Deposit" : "Balance"}: ${job.title}`.slice(0, 100),
    expirySeconds: INVOICE_LIFETIME_SECONDS,
  });
  // Never show a client an invoice for a different amount than the one we priced.
  if (made.amountSats !== amountSats) {
    throw new InvoiceError("The wallet made an invoice for the wrong amount.", "wallet-mismatch");
  }

  const ourExpiry = now.getTime() + INVOICE_LIFETIME_SECONDS * 1000;
  const invoice = await store.transaction(async (tx) => {
    const saved = await tx.insertInvoice({
      jobId: job.id,
      purpose,
      bolt11: made.bolt11,
      paymentHash: made.paymentHash,
      amountSats,
      fiatMinor,
      currency: job.currency,
      rateUsed: rate,
      expiresAt: new Date(Math.min(ourExpiry, made.expiresAt.getTime())),
    });
    if (purpose === "deposit" && job.status === "created") {
      assertMove("created", "deposit_pending", false);
      await tx.moveJob(job.id, "created", "deposit_pending", "system", "Deposit invoice created");
    }
    // Asking for the balance is what moves a finished job into "balance_pending".
    if (purpose === "balance" && job.status === "ready") {
      assertMove("ready", "balance_pending", false);
      await tx.moveJob(job.id, "ready", "balance_pending", "seller", "Balance requested");
    }
    return saved;
  });
  return invoice;
}

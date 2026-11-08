import type { InvoicePurpose } from "@/generated/prisma/enums";
import type { JobStore } from "@/lib/jobs/job-store";
import type { DemoWalletProvider } from "./demo-wallet";

export type PracticePayResult = "paid" | "nothing-to-pay";

// Settles the open invoice of a demo job in the practice wallet. The caller has already proved
// the job belongs to a demo seller. Nothing comes from the browser except the job's token, so the
// amount is whatever the server already invoiced. Recording the payment in the job itself is
// left to the normal polling (markInvoicePaid), which keeps one path for real and practice money.
export async function practicePay(
  store: JobStore,
  wallet: DemoWalletProvider,
  jobId: string,
): Promise<PracticePayResult> {
  const purposes: InvoicePurpose[] = ["deposit", "balance"];
  for (const purpose of purposes) {
    const pending = await store.findPendingInvoice(jobId, purpose);
    if (pending && (await wallet.simulatePayment(pending.paymentHash))) return "paid";
  }
  return "nothing-to-pay";
}

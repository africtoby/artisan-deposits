import type { JobStatus } from "@/generated/prisma/enums";
import type { CreateInvoiceDeps } from "./create-invoice";
import { clientTimeline, type TimelineEntry } from "./client-timeline";
import { refreshPayment, type ClientPaymentState } from "./client-payment";

// Everything the client page may know about a job, as plain JSON. Built on the server on every
// poll, so a rule like "no delivery link before completed" is enforced here and not in the UI.
export type ClientJobState = {
  status: JobStatus;
  payment: ClientPaymentState;
  deliveryUrl: string | null;
  timeline: TimelineEntry[];
};

export async function loadClientJobState(
  deps: CreateInvoiceDeps,
  jobId: string,
): Promise<ClientJobState | null> {
  const { store } = deps;
  const first = await store.findJobById(jobId);
  if (!first) return null;

  let payment: ClientPaymentState = { kind: "none" };
  if (first.status === "created" || first.status === "deposit_pending") {
    payment = await refreshPayment(deps, jobId, "deposit");
  } else if (first.status === "balance_pending") {
    payment = await refreshPayment(deps, jobId, "balance");
  }

  // Read again: seeing a payment may have just moved the job on.
  const job = await store.findJobById(jobId);
  if (!job) return null;
  if (payment.kind === "paid") payment = { kind: "none" };
  if (job.status === "cancelled") payment = { kind: "none" };

  return {
    status: job.status,
    payment,
    // The one place the link is released: only once the job is completed.
    deliveryUrl: job.status === "completed" ? job.deliveryUrl : null,
    timeline: clientTimeline(await store.listEvents(jobId)),
  };
}

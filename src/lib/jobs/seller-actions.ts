import type { JobStatus } from "@/generated/prisma/enums";
import { createInvoice, type CreateInvoiceDeps } from "./create-invoice";
import { parseDeliveryUrl } from "./delivery-url";
import type { JobRecord, JobStore } from "./job-store";
import { assertMove } from "./status-machine";

export type SellerAction = "start-work" | "mark-ready" | "mark-done" | "cancel";

export class SellerActionError extends Error {
  constructor(
    message: string,
    readonly code: "not-found" | "not-allowed" | "invalid",
  ) {
    super(message);
    this.name = "SellerActionError";
  }
}

const TARGET: Record<SellerAction, { to: JobStatus; note: string }> = {
  "start-work": { to: "in_progress", note: "Work started" },
  "mark-ready": { to: "ready", note: "Work ready" },
  // Only reachable when nothing is owed; assertMove rejects it otherwise.
  "mark-done": { to: "completed", note: "Marked done" },
  cancel: { to: "cancelled", note: "Cancelled by seller" },
};

// A job that is not yours looks exactly like a job that does not exist.
async function ownJob(store: JobStore, sellerId: string, jobId: string): Promise<JobRecord> {
  const job = await store.findJobById(jobId);
  if (!job || job.sellerId !== sellerId) throw new SellerActionError("Job not found.", "not-found");
  return job;
}

// `sellerId` is the seller profile id found from the signed-in session, never from the browser.
export async function performSellerAction(
  store: JobStore,
  sellerId: string,
  jobId: string,
  action: SellerAction,
): Promise<void> {
  const job = await ownJob(store, sellerId, jobId);
  const target = TARGET[action];
  try {
    assertMove(job.status, target.to, job.priceMinor === job.depositMinor);
  } catch {
    throw new SellerActionError(
      "That step is not available for this job right now.",
      "not-allowed",
    );
  }
  // Guarded move: if a payment moved the job a moment ago, this fails instead of overwriting it.
  const moved = await store.moveJob(job.id, job.status, target.to, "seller", target.note);
  if (!moved) {
    throw new SellerActionError("The job changed. Reload the page and try again.", "not-allowed");
  }
}

// Makes the balance invoice. createInvoice moves the job to balance_pending in the same step.
export async function requestBalance(
  deps: CreateInvoiceDeps,
  sellerId: string,
  jobId: string,
): Promise<void> {
  const job = await ownJob(deps.store, sellerId, jobId);
  if (job.status !== "ready" && job.status !== "balance_pending") {
    throw new SellerActionError(
      "Mark the work ready before asking for the balance.",
      "not-allowed",
    );
  }
  if (job.priceMinor === job.depositMinor) {
    throw new SellerActionError("Nothing is owed. Mark the job done instead.", "not-allowed");
  }
  await createInvoice(deps, job.id, "balance");
}

export async function saveDeliveryLink(
  store: JobStore,
  sellerId: string,
  jobId: string,
  rawUrl: unknown,
): Promise<void> {
  const job = await ownJob(store, sellerId, jobId);
  if (job.status === "cancelled") {
    throw new SellerActionError("This job was cancelled.", "not-allowed");
  }
  const parsed = parseDeliveryUrl(rawUrl);
  if (!parsed.ok) throw new SellerActionError(parsed.message, "invalid");
  await store.setDeliveryUrl(job.id, parsed.url);
}

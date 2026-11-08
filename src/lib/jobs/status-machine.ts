import type { JobStatus } from "@/generated/prisma/enums";

export class StatusError extends Error {
  constructor(from: JobStatus, to: JobStatus) {
    super(`A job cannot move from ${from} to ${to}.`);
    this.name = "StatusError";
  }
}

// The straight path. `ready` forks in nextStatuses depending on whether a balance is owed.
const FORWARD: Partial<Record<JobStatus, JobStatus>> = {
  created: "deposit_pending",
  deposit_pending: "deposit_paid",
  deposit_paid: "in_progress",
  in_progress: "ready",
  balance_pending: "completed",
};

// Every status the job may move to next. `cancelled` is allowed from anything not yet finished,
// and nothing leaves `completed` or `cancelled`.
export function nextStatuses(from: JobStatus, balanceIsZero: boolean): JobStatus[] {
  if (from === "completed" || from === "cancelled") return [];
  const next: JobStatus[] = [];
  if (from === "ready") next.push(balanceIsZero ? "completed" : "balance_pending");
  // A job paid in full upfront never waits on a balance, so that status has no way out.
  else if (from === "balance_pending" && balanceIsZero) return ["cancelled"];
  else {
    const forward = FORWARD[from];
    if (forward) next.push(forward);
  }
  next.push("cancelled");
  return next;
}

export function canMove(from: JobStatus, to: JobStatus, balanceIsZero: boolean): boolean {
  return nextStatuses(from, balanceIsZero).includes(to);
}

export function assertMove(from: JobStatus, to: JobStatus, balanceIsZero: boolean): void {
  if (!canMove(from, to, balanceIsZero)) throw new StatusError(from, to);
}

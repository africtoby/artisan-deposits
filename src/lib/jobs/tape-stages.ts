// Maps the eight job statuses to the five stages the client sees on the tape.
// Kept apart from status-machine.ts (Phase 5) because this only decides what to show.

export type JobStatusName =
  | "created"
  | "deposit_pending"
  | "deposit_paid"
  | "in_progress"
  | "ready"
  | "balance_pending"
  | "completed"
  | "cancelled";

export type StageKey = "deposit" | "in_progress" | "ready" | "balance" | "done";

const STAGE_LABELS: Record<StageKey, string> = {
  deposit: "Deposit",
  in_progress: "In progress",
  ready: "Ready",
  balance: "Balance",
  done: "Done",
};

const STAGE_OF_STATUS: Record<Exclude<JobStatusName, "cancelled">, StageKey> = {
  created: "deposit",
  deposit_pending: "deposit",
  // The deposit is in, so the pin moves on to "In progress" even before the seller starts.
  deposit_paid: "in_progress",
  in_progress: "in_progress",
  ready: "ready",
  balance_pending: "balance",
  completed: "done",
};

export type TapeStage = { key: StageKey; number: number; label: string };

export type TapeProgress =
  | { kind: "active"; stages: TapeStage[]; current: TapeStage; text: string }
  // A cancelled job keeps its stages visible but has no pin: it did not stop at any of them.
  | { kind: "cancelled"; stages: TapeStage[]; text: string };

// With nothing left to pay, the "Balance" stage is skipped and the remaining ones are
// renumbered, so the client never sees a gap like "3, then 5".
export function tapeProgress(status: JobStatusName, balanceIsZero: boolean): TapeProgress {
  const keys = (Object.keys(STAGE_LABELS) as StageKey[]).filter(
    (key) => !(balanceIsZero && key === "balance"),
  );
  const stages = keys.map((key, index) => ({
    key,
    number: index + 1,
    label: STAGE_LABELS[key],
  }));

  if (status === "cancelled") {
    return { kind: "cancelled", stages, text: "Cancelled" };
  }

  const currentKey = STAGE_OF_STATUS[status];
  const current = stages.find((stage) => stage.key === currentKey);
  if (!current) {
    // Only reachable for balance_pending on a zero-balance job, which the state machine forbids.
    throw new Error(`Status ${status} cannot occur when the balance is zero.`);
  }
  return {
    kind: "active",
    stages,
    current,
    text: `Step ${current.number} of ${stages.length}: ${current.label}`,
  };
}

import type { JobStatus } from "@/generated/prisma/enums";
import type { EventRecord } from "./job-store";

export type TimelineEntry = { label: string; at: string };

// Plain words for the client. The internal notes ("Deposit invoice created") stay private.
const LABELS: Record<JobStatus, string> = {
  created: "Job created",
  deposit_pending: "Deposit requested",
  deposit_paid: "Deposit paid",
  in_progress: "Work started",
  ready: "Work ready",
  balance_pending: "Balance requested",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function clientTimeline(events: EventRecord[]): TimelineEntry[] {
  return events.map((event) => ({
    label: LABELS[event.toStatus],
    at: event.createdAt.toISOString(),
  }));
}

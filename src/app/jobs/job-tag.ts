import type { JobStatus } from "@/generated/prisma/enums";
import type { TagKind } from "@/components/tag";

// Owed means the client still has money to pay, which is the only thing the seller must chase.
export function tagFor(status: JobStatus): { kind: TagKind; label?: string } {
  switch (status) {
    case "created":
    case "deposit_pending":
      return { kind: "owed", label: "Deposit owed" };
    case "balance_pending":
      return { kind: "owed", label: "Balance owed" };
    case "cancelled":
      return { kind: "cancelled" };
    case "completed":
      return { kind: "paid", label: "Done" };
    case "deposit_paid":
      return { kind: "paid", label: "Deposit paid" };
    case "in_progress":
      return { kind: "paid", label: "In progress" };
    case "ready":
      return { kind: "paid", label: "Ready" };
  }
}

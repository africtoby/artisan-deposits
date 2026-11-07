import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TagKind = "paid" | "owed" | "expired" | "cancelled";

const styles: Record<TagKind, string> = {
  paid: "bg-paid-tint text-paid",
  // The yellow tint is reserved for money still owed.
  owed: "bg-tape-tint text-ink",
  expired: "border border-ink-soft bg-ground text-ink-soft",
  cancelled: "border border-ink-soft bg-ground text-ink-soft",
};

const defaultLabels: Record<TagKind, string> = {
  paid: "Paid",
  owed: "Owed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function Tag({ kind, children }: { kind: TagKind; children?: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-tag text-small inline-flex items-center gap-1 px-2 py-0.5 font-semibold",
        styles[kind],
      )}
    >
      {kind === "paid" && <Check size={14} strokeWidth={1.5} aria-hidden />}
      {children ?? defaultLabels[kind]}
    </span>
  );
}

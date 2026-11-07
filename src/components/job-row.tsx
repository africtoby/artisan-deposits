import Link from "next/link";
import { formatMinor, type CurrencyCode } from "@/lib/money/currencies";
import { cn } from "@/lib/cn";
import { Tag, type TagKind } from "./tag";

type JobRowProps = {
  href: string;
  title: string;
  clientName: string;
  amountMinor: bigint;
  currency: CurrencyCode;
  tag: { kind: TagKind; label?: string };
};

// A row, not a card: rows are divided by a dye-line. A row that is waiting on money
// (an Owed tag) is the only one that gets the yellow tint, and it should be listed first.
export function JobRow({ href, title, clientName, amountMinor, currency, tag }: JobRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "border-dye-line flex min-h-16 items-center justify-between gap-4 border-b px-4 py-3",
        tag.kind === "owed" ? "bg-tape-tint" : "bg-surface",
      )}
    >
      <span className="min-w-0">
        <span className="text-ink block truncate font-semibold">{title}</span>
        <span className="text-small text-ink-soft block truncate">{clientName}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-ink font-semibold tabular-nums">
          {formatMinor(amountMinor, currency)}
        </span>
        <Tag kind={tag.kind}>{tag.label}</Tag>
      </span>
    </Link>
  );
}

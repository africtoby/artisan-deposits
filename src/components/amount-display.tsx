import { formatMinor, formatSats, type CurrencyCode } from "@/lib/money/currencies";
import { cn } from "@/lib/cn";

type AmountDisplayProps = {
  amountMinor: bigint;
  currency: CurrencyCode;
  // Shown small underneath. Local money is always the hero; sats are the footnote.
  sats?: bigint;
  className?: string;
};

export function AmountDisplay({ amountMinor, currency, sats, className }: AmountDisplayProps) {
  return (
    <div className={className}>
      <p className="font-display text-amount text-ink font-extrabold tabular-nums">
        {formatMinor(amountMinor, currency)}
      </p>
      {sats !== undefined && (
        <p className={cn("text-small text-ink-soft tabular-nums")}>about {formatSats(sats)} sats</p>
      )}
    </div>
  );
}

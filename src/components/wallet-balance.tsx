import { formatSats } from "@/lib/money/currencies";

// The balance is the biggest thing on the wallet screen. No card art, just the number.
export function WalletBalance({ sats }: { sats: bigint }) {
  return (
    <div>
      <p className="text-small text-ink-soft">Balance</p>
      <p className="font-display text-amount text-ink font-extrabold tabular-nums">
        {formatSats(sats)} <span className="text-h2 font-semibold">sats</span>
      </p>
    </div>
  );
}

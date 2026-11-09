import { formatSats, type CurrencyCode } from "@/lib/money/currencies";
import { AmountDisplay } from "./amount-display";

type WalletBalanceProps = {
  sats: bigint;
  // Both come together. Without a rate (the rate sources are down) only the sats are shown.
  fiat?: { amountMinor: bigint; currency: CurrencyCode };
};

// The balance is the biggest thing on the wallet screen, on one white surface. No card art.
export function WalletBalance({ sats, fiat }: WalletBalanceProps) {
  return (
    <div className="rounded-control bg-surface flex flex-col gap-1 px-4 py-5">
      <p className="text-small text-ink-soft">Balance</p>
      {fiat ? (
        <AmountDisplay
          amountMinor={fiat.amountMinor}
          currency={fiat.currency}
          sats={sats}
          exactSats
        />
      ) : (
        <p className="font-display text-amount text-ink font-extrabold tabular-nums">
          {formatSats(sats)} <span className="text-h2 font-semibold">sats</span>
        </p>
      )}
    </div>
  );
}

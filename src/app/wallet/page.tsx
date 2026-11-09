import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Tag } from "@/components/tag";
import { TestCoinsBanner } from "@/components/test-coins-banner";
import { WalletBalance } from "@/components/wallet-balance";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/lib/auth/current-user";
import { CASH_OUT_PARTNERS } from "@/lib/cash-out-partners";
import { satsToFiatMinor } from "@/lib/money/convert";
import { formatSats } from "@/lib/money/currencies";
import { getRate } from "@/lib/rates/get-rate";
import { getDefaultCurrency, openWalletForSeller } from "@/lib/sellers/seller-profile";
import { loadWalletOverview, type WalletOverview } from "@/lib/wallet/receive";
import { isTestNetwork } from "@/lib/wallet/wallet-provider";
import { ReceivePanel } from "./receive-panel";

export const metadata: Metadata = { title: "Wallet" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export default function WalletPage() {
  return (
    <Suspense>
      <WalletContent />
    </Suspense>
  );
}

async function WalletContent() {
  // The exchange rate cache reads the clock, so wait for a real request before anything else.
  await connection();
  const user = await requireUser();
  const wallet = await openWalletForSeller(user.id);

  let overview: WalletOverview | null = null;
  let failed = false;
  if (wallet) {
    try {
      overview = await loadWalletOverview(wallet);
    } catch {
      failed = true;
    } finally {
      wallet.close();
    }
  }

  // The balance and the receive form speak the seller's own currency. If no rate can be had, the
  // page still works in sats instead of failing.
  const currency = await getDefaultCurrency(user.id);
  let rate: string | null = null;
  if (overview) {
    try {
      rate = (await getRate(currency)).rate;
    } catch {
      rate = null;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-8">
      {overview && isTestNetwork(overview.info.network) && <TestCoinsBanner />}
      <div className="flex flex-col gap-2">
        <Wordmark />
        <h1 className="text-body text-ink font-semibold">Wallet</h1>
      </div>

      {!wallet && (
        <EmptyState
          message="Connect your wallet to get paid. Money goes straight to it. We never hold it."
          action={<ButtonLink href="/connect-wallet">Connect wallet</ButtonLink>}
        />
      )}

      {failed && (
        <p role="alert" className="text-error">
          Couldn&apos;t reach your wallet. Check that it is online, then reload this page.
        </p>
      )}

      {overview && (
        <>
          <WalletBalance
            sats={overview.balanceSats}
            fiat={
              rate
                ? {
                    amountMinor: satsToFiatMinor(overview.balanceSats, currency, rate),
                    currency,
                  }
                : undefined
            }
          />

          <section aria-labelledby="receive" className="flex flex-col gap-3">
            <h2 id="receive" className="font-display text-h2 text-ink font-extrabold">
              Receive
            </h2>
            <ReceivePanel currency={currency} rate={rate} />
          </section>

          <section aria-labelledby="transactions" className="flex flex-col gap-3">
            <h2 id="transactions" className="font-display text-h2 text-ink font-extrabold">
              Recent transactions
            </h2>
            {overview.transactions.length === 0 ? (
              <EmptyState message="No payments yet. When a client pays a deposit, it shows here." />
            ) : (
              <ul className="border-dye-line border-t">
                {overview.transactions.map((tx) => {
                  const incoming = tx.direction === "incoming";
                  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <li
                      key={`${tx.paymentHash}-${tx.direction}`}
                      className="border-dye-line bg-surface flex min-h-16 items-center justify-between gap-4 border-b px-4 py-3"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon size={20} strokeWidth={1.5} aria-hidden className="shrink-0" />
                        <span className="min-w-0">
                          <span className="text-ink block truncate font-semibold">
                            {incoming ? "Received" : "Sent"}
                            {tx.description ? `: ${tx.description}` : ""}
                          </span>
                          <span className="text-small text-ink-soft block">
                            {dateFormat.format(tx.settledAt ?? tx.createdAt)} UTC
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-ink font-semibold tabular-nums">
                          {incoming ? "+" : "-"}
                          {formatSats(tx.amountSats)} sats
                        </span>
                        {tx.state === "settled" ? (
                          <Tag kind="paid" />
                        ) : tx.state === "pending" ? (
                          <Tag kind="owed">Waiting</Tag>
                        ) : (
                          <Tag kind="expired">Failed</Tag>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="cash-out" className="flex flex-col gap-3">
        <h2 id="cash-out" className="font-display text-h2 text-ink font-extrabold">
          Cash out
        </h2>
        <p className="text-ink">
          Turn sats into local money through a partner. We never touch your money.
        </p>
        <ul className="border-dye-line border-t">
          {CASH_OUT_PARTNERS.map((partner) => (
            <li key={partner.name} className="border-dye-line bg-surface border-b">
              <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-16 items-center justify-between gap-4 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="text-ink block font-semibold">{partner.name}</span>
                  <span className="text-small text-ink-soft block">{partner.description}</span>
                </span>
                <ExternalLink size={20} strokeWidth={1.5} aria-hidden className="shrink-0" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

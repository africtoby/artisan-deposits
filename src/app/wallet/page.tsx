import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Tag } from "@/components/tag";
import { TestCoinsBanner } from "@/components/test-coins-banner";
import { WalletBalance } from "@/components/wallet-balance";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/lib/auth/current-user";
import { CASH_OUT_PARTNERS } from "@/lib/cash-out-partners";
import { formatSats } from "@/lib/money/currencies";
import { openWalletForSeller } from "@/lib/sellers/seller-profile";
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

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-8">
      <Wordmark />
      <h1 className="font-display text-h1 text-ink font-extrabold">Wallet</h1>

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
          {isTestNetwork(overview.info.network) && <TestCoinsBanner />}
          <WalletBalance sats={overview.balanceSats} />

          <section aria-labelledby="receive" className="flex flex-col gap-3">
            <h2 id="receive" className="font-display text-h2 text-ink font-extrabold">
              Receive
            </h2>
            <ReceivePanel />
          </section>

          <section aria-labelledby="transactions" className="flex flex-col gap-3">
            <h2 id="transactions" className="font-display text-h2 text-ink font-extrabold">
              Recent transactions
            </h2>
            {overview.transactions.length === 0 ? (
              <p className="text-ink">No transactions yet.</p>
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

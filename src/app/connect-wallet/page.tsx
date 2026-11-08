import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/button";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/lib/auth/current-user";
import { getWalletStatus } from "@/lib/sellers/seller-profile";
import { signOutAction } from "../sign-out/actions";
import { WalletPanel } from "./wallet-panel";

export const metadata: Metadata = { title: "Connect your wallet" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const CAN = [
  "Make an invoice so a client can pay you",
  "Check whether an invoice was paid",
  "Show your balance and recent payments",
];

const CANNOT = [
  "Spend or send your money. The app has no way to pay out, and real-money links that can spend are refused",
  "Hold your money. Payments go straight into your wallet",
  "Show your wallet link to anyone. It is stored encrypted",
];

// The whole page waits behind the sign-in check, so a visitor who is not signed in is sent to
// /sign-in before any of it is sent to their browser.
export default function ConnectWalletPage() {
  return (
    <Suspense>
      <ConnectWalletContent />
    </Suspense>
  );
}

async function ConnectWalletContent() {
  const user = await requireUser();
  const status = await getWalletStatus(user.id);
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 text-ink font-extrabold">Connect your wallet</h1>
        <p className="text-ink">
          Connect your wallet to get paid. Money goes straight to it. We never hold it.
        </p>
      </div>

      <WalletPanel
        connected={status.connected}
        connectedOn={status.connected ? dateFormat.format(status.connectedAt) : null}
      />

      <section aria-labelledby="permissions" className="rounded-control bg-surface p-4">
        <h2 id="permissions" className="font-display text-h2 text-ink font-extrabold">
          What this app can and cannot do with your wallet
        </h2>
        <h3 className="text-ink mt-4 font-semibold">It can</h3>
        <ul className="text-ink mt-1 list-disc pl-5">
          {CAN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3 className="text-ink mt-4 font-semibold">It cannot</h3>
        <ul className="text-ink mt-1 list-disc pl-5">
          {CANNOT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

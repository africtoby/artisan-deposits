import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AmountDisplay } from "@/components/amount-display";
import { Button, ButtonLink } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/input";
import { JobRow } from "@/components/job-row";
import { PaymentSlip } from "@/components/payment-slip";
import { Tag } from "@/components/tag";
import { Tape } from "@/components/tape";
import { TestCoinsBanner } from "@/components/test-coins-banner";
import { WalletBalance } from "@/components/wallet-balance";
import { Wordmark } from "@/components/wordmark";
import { tapeProgress } from "@/lib/jobs/tape-stages";

export const metadata: Metadata = {
  title: "Brand",
  // This page is for checking the design. It is not linked anywhere and returns 404 in production.
  robots: { index: false, follow: false },
};

const SAMPLE_INVOICE =
  "lnbc312500n1pjsample0notapayableinvoice0000000000000000000000000000000000000000000000000000000";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-dye-line flex flex-col gap-4 border-t pt-6">
      <h2 className="font-display text-h2 text-ink font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-small text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

export default function BrandPage() {
  // Design check page only: a 404 on the live site so strangers cannot browse it.
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Wordmark />
        <h1 className="font-display text-h1 text-ink font-extrabold">Brand and components</h1>
        <p className="text-ink">Every component and state. Check this page on your phone.</p>
      </header>

      <Section title="Type">
        <p className="font-display text-amount text-ink font-extrabold">₦40,000</p>
        <p className="font-display text-h1 text-ink font-extrabold">Page title, 36</p>
        <p className="font-display text-h2 text-ink font-semibold">Section title, 26</p>
        <p className="text-body text-ink">
          Body text is 17 on 26. It stays under about 65 characters a line so it reads easily on a
          phone in bright sun.
        </p>
        <p className="text-small text-ink-soft">Small text is 14 on 20. Nothing goes below it.</p>
      </Section>

      <Section title="Buttons">
        <Sample label="Primary">
          <Button fullWidth>Create job</Button>
        </Sample>
        <Sample label="Secondary">
          <Button variant="secondary" fullWidth>
            Copy invoice
          </Button>
        </Sample>
        <Sample label="Danger">
          <Button variant="danger" fullWidth>
            Cancel job
          </Button>
        </Sample>
        <Sample label="Loading">
          <Button loading fullWidth>
            Send sign-in link
          </Button>
        </Sample>
        <Sample label="Disabled">
          <Button disabled fullWidth>
            Request balance
          </Button>
        </Sample>
        <Sample label="Link styled as a button">
          <ButtonLink href="/brand" variant="secondary" fullWidth>
            Back to top of this page
          </ButtonLink>
        </Sample>
      </Section>

      <Section title="Inputs">
        <Input label="Client name" name="demo-name" placeholder="Amaka Obi" />
        <Input
          label="Deposit"
          name="demo-deposit"
          inputMode="numeric"
          hint="Most sellers ask for half."
          defaultValue="20000"
        />
        <Input
          label="Price"
          name="demo-price"
          defaultValue="abc"
          error="Enter the price as a number, like 40000."
        />
        <Input label="Disabled field" name="demo-disabled" disabled defaultValue="Locked" />
      </Section>

      <Section title="Tags">
        <div className="flex flex-wrap gap-2">
          <Tag kind="paid" />
          <Tag kind="owed" />
          <Tag kind="expired" />
          <Tag kind="cancelled" />
        </div>
      </Section>

      <Section title="Tape: countdown">
        <p className="text-ink">
          The tape shrinks over the 15 minutes an invoice is open. It runs edge to edge on real
          pages.
        </p>
      </Section>
      <div className="-mx-4">
        <Suspense fallback={<div className="bg-tape h-9" />}>
          <LiveCountdown />
        </Suspense>
      </div>

      <Section title="Tape: progress">
        <p className="text-ink">After payment it shows the job stages. Four examples:</p>
      </Section>
      <div className="-mx-4 flex flex-col gap-8">
        <Sample label="In progress, balance still to pay">
          <Tape mode="progress" progress={tapeProgress("in_progress", false)} />
        </Sample>
        <Sample label="Ready for the balance">
          <Tape mode="progress" progress={tapeProgress("balance_pending", false)} />
        </Sample>
        <Sample label="Paid in full upfront, so no balance stage">
          <Tape mode="progress" progress={tapeProgress("ready", true)} />
        </Sample>
        <Sample label="Cancelled">
          <Tape mode="progress" progress={tapeProgress("cancelled", false)} />
        </Sample>
      </div>

      <Section title="Amount">
        <AmountDisplay amountMinor={4_000_000n} currency="NGN" sats={31_250n} />
        <AmountDisplay amountMinor={25_000n} currency="XOF" sats={1_070n} />
        <AmountDisplay amountMinor={12_550n} currency="USD" sats={118_000n} />
      </Section>

      <Section title="Payment slip">
        <Sample label="Open (sample, not payable)">
          <PaymentSlip bolt11={SAMPLE_INVOICE} state="open" />
        </Sample>
        <Sample label="Paid">
          <PaymentSlip bolt11={SAMPLE_INVOICE} state="paid" />
        </Sample>
        <Sample label="Expired">
          <PaymentSlip bolt11={SAMPLE_INVOICE} state="expired" />
        </Sample>
      </Section>

      <Section title="Job rows">
        <div className="border-dye-line -mx-4 border-t">
          <JobRow
            href="/brand"
            title="Wedding agbada"
            clientName="Chidi Eze"
            amountMinor={4_000_000n}
            currency="NGN"
            tag={{ kind: "owed", label: "Deposit owed" }}
          />
          <JobRow
            href="/brand"
            title="Logo and brand sheet"
            clientName="Northwind Studio"
            amountMinor={45_000n}
            currency="USD"
            tag={{ kind: "paid", label: "Deposit paid" }}
          />
          <JobRow
            href="/brand"
            title="Kitchen cabinet"
            clientName="Wanjiru K."
            amountMinor={1_200_000n}
            currency="KES"
            tag={{ kind: "expired" }}
          />
          <JobRow
            href="/brand"
            title="Phone screen repair"
            clientName="Kofi A."
            amountMinor={18_000n}
            currency="GHS"
            tag={{ kind: "cancelled" }}
          />
        </div>
      </Section>

      <Section title="Wallet balance">
        <WalletBalance sats={284_150n} />
        <TestCoinsBanner />
      </Section>

      <Section title="Empty state">
        <EmptyState
          message="No jobs yet. Create a job to send your first deposit link."
          action={<Button>Create job</Button>}
        />
      </Section>

      <Section title="Sign-in wordmark">
        <div className="rounded-control bg-ink p-4">
          <Wordmark onDark />
        </div>
      </Section>
    </main>
  );
}

// Reading the clock makes this page-part dynamic, so it waits for the request (Cache Components).
async function LiveCountdown() {
  await connection();
  // eslint-disable-next-line react-hooks/purity -- demo only: real pages read expiresAt from the invoice row, and connection() above already makes this request-time
  const expiresAt = new Date(Date.now() + 12 * 60_000 + 40_000).toISOString();
  return <Tape mode="countdown" expiresAt={expiresAt} />;
}

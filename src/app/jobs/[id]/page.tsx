import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AmountDisplay } from "@/components/amount-display";
import { Tag } from "@/components/tag";
import { requireUser } from "@/lib/auth/current-user";
import { getSellerJob } from "@/lib/jobs/seller-jobs";
import { formatMinor } from "@/lib/money/currencies";
import { tagFor } from "../job-tag";
import { ClientLinkActions } from "./copy-link";
import { DeliveryLinkForm, JobControls } from "./job-controls";

export const metadata: Metadata = { title: "Job", robots: { index: false } };

// Statuses where the seller has a step to take. That step is the page's one main button.
const SELLER_TURN = ["deposit_paid", "in_progress", "ready"];

export default function JobPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <Suspense>
      <JobContent params={params} />
    </Suspense>
  );
}

async function JobContent({ params }: { params: PageProps<"/jobs/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  const job = await getSellerJob(user.id, id);
  if (!job) notFound();

  const tag = tagFor(job.status);
  const balanceIsZero = job.priceMinor === job.depositMinor;
  const finished = job.status === "cancelled";
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-4 py-8">
      <Link href="/jobs" className="text-indigo font-semibold underline">
        Back to jobs
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 text-ink font-extrabold">{job.title}</h1>
        <p className="text-ink-soft">{job.clientName}</p>
        <div>
          <Tag kind={tag.kind}>{tag.label}</Tag>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <AmountDisplay amountMinor={job.priceMinor} currency={job.currency} />
        <p className="text-ink">
          Deposit {formatMinor(job.depositMinor, job.currency)}.{" "}
          {balanceIsZero
            ? "Paid in full upfront."
            : `Balance ${formatMinor(job.priceMinor - job.depositMinor, job.currency)}.`}
        </p>
      </div>

      <section aria-labelledby="next-step" className="flex flex-col gap-3">
        <h2 id="next-step" className="font-display text-h2 text-ink font-extrabold">
          Next step
        </h2>
        <JobControls jobId={job.id} status={job.status} balanceIsZero={balanceIsZero} />
      </section>

      {!finished && (
        <section aria-labelledby="client-link" className="flex flex-col gap-3">
          <h2 id="client-link" className="font-display text-h2 text-ink font-extrabold">
            Send this to your client
          </h2>
          <p className="text-ink">
            The client opens the link, pays in {job.currency} by Lightning and follows the job. The
            money goes straight to your wallet.
          </p>
          <ClientLinkActions
            path={`/j/${job.publicToken}`}
            clientName={job.clientName}
            title={job.title}
            quiet={SELLER_TURN.includes(job.status)}
          />
        </section>
      )}

      {!finished && (
        <section aria-labelledby="delivery" className="flex flex-col gap-3">
          <h2 id="delivery" className="font-display text-h2 text-ink font-extrabold">
            Delivery link
          </h2>
          <DeliveryLinkForm jobId={job.id} current={job.deliveryUrl} />
        </section>
      )}
    </main>
  );
}

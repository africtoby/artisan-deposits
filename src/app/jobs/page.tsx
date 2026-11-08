import type { Metadata } from "next";
import { Suspense } from "react";
import { Button, ButtonLink } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { JobRow } from "@/components/job-row";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/lib/auth/current-user";
import { listSellerJobs } from "@/lib/jobs/seller-jobs";
import { signOutAction } from "../sign-out/actions";
import { tagFor } from "./job-tag";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <Suspense>
      <JobsContent />
    </Suspense>
  );
}

async function JobsContent() {
  const user = await requireUser();
  const jobs = await listSellerJobs(user.id);
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 py-8">
      <header className="flex items-center justify-between px-4">
        <Wordmark />
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>
      <div className="flex items-center justify-between gap-4 px-4">
        <h1 className="font-display text-h1 text-ink font-extrabold">Jobs</h1>
        {jobs.length > 0 && <ButtonLink href="/jobs/new">Create job</ButtonLink>}
      </div>
      {jobs.length === 0 ? (
        <div className="px-4">
          <EmptyState
            message="No jobs yet. Create a job to send your first deposit link."
            action={<ButtonLink href="/jobs/new">Create job</ButtonLink>}
          />
        </div>
      ) : (
        <div className="border-dye-line border-t">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              href={`/jobs/${job.id}`}
              title={job.title}
              clientName={job.clientName}
              amountMinor={job.priceMinor}
              currency={job.currency}
              tag={tagFor(job.status)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

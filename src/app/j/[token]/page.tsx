import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/wordmark";
import { clientIpFrom } from "@/lib/client-ip";
import { loadClientJob } from "@/lib/jobs/client-page";
import { ClientJob } from "./client-job";

// The link is private: keep it out of search results and out of the Referer header.
export const metadata: Metadata = {
  title: "Your job",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ClientJobPage({ params }: PageProps<"/j/[token]">) {
  return (
    <Suspense>
      <ClientJobContent params={params} />
    </Suspense>
  );
}

async function ClientJobContent({ params }: { params: PageProps<"/j/[token]">["params"] }) {
  const { token } = await params;
  const result = await loadClientJob(token, clientIpFrom(await headers()));
  if (!result.ok && result.reason === "not-found") notFound();

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 pb-12">
      {result.ok ? (
        <ClientJob
          token={token}
          title={result.view.title}
          clientName={result.view.clientName}
          currency={result.view.currency}
          priceMinor={result.view.priceMinor}
          depositMinor={result.view.depositMinor}
          initial={result.view.state}
          demo={result.view.demo}
        />
      ) : (
        <div className="flex flex-col gap-3 px-4 py-8">
          <Wordmark />
          <p className="text-ink">
            {result.reason === "busy"
              ? "Too many requests. Wait a minute and reload this page."
              : "Couldn't make the invoice just now. Try again in a minute."}
          </p>
        </div>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { TestCoinsBanner } from "@/components/test-coins-banner";
import { Wordmark } from "@/components/wordmark";
import { DemoForm } from "./demo-form";

export const metadata: Metadata = { title: "Demo" };

// Public on purpose: a judge opens this with no account and no wallet.
export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 py-8">
      <Wordmark />
      <h1 className="font-display text-h1 text-ink font-extrabold">Try it in a minute</h1>
      <TestCoinsBanner />
      <ol className="text-ink flex list-decimal flex-col gap-2 pl-5">
        <li>You start as a seller with two sample jobs.</li>
        <li>Open a job and copy the client link.</li>
        <li>Open that link as the client and pay the deposit with practice coins.</li>
        <li>Come back, move the job along, and collect the balance.</li>
      </ol>
      <DemoForm />
      <p className="text-small text-ink-soft">
        Demo data is deleted after a day. Real sellers{" "}
        <Link href="/sign-in" className="underline">
          sign in here
        </Link>
        .
      </p>
    </main>
  );
}

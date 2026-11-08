import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/wordmark";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

// The one full-dark screen in the app (see brand.md): ink background, form on a white sheet.
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="bg-ink flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-12">
        <Wordmark onDark />
        <h1 className="font-display text-h1 text-surface mt-6 max-w-[14ch] font-extrabold">
          Get paid before the work is done
        </h1>
      </div>
      <div className="rounded-t-sheet bg-surface mx-auto w-full max-w-[480px] px-4 pt-6 pb-10">
        <h2 className="font-display text-h2 text-ink mb-5 font-extrabold">Sign in</h2>
        <Suspense>
          <LinkProblem searchParams={searchParams} />
        </Suspense>
        <SignInForm />
        <p className="text-small text-ink-soft mt-6">
          Just looking?{" "}
          <Link href="/demo" className="underline">
            Try the demo
          </Link>{" "}
          with practice coins.
        </p>
      </div>
    </main>
  );
}

// /auth/confirm sends people here with ?error=link when the emailed link was used up or expired.
async function LinkProblem({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "link") return null;
  return (
    <p
      role="alert"
      className="rounded-control bg-error-tint text-small text-error mb-5 flex items-start gap-2 px-4 py-3"
    >
      <CircleAlert size={18} strokeWidth={1.5} aria-hidden className="mt-px shrink-0" />
      That sign-in link did not work. It may have expired or been used already. Send a new one.
    </p>
  );
}

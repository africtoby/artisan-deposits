import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { getWalletStatus } from "@/lib/sellers/seller-profile";
import { JobForm } from "./job-form";

export const metadata: Metadata = { title: "Create job" };

export default function NewJobPage() {
  return (
    <Suspense>
      <NewJobContent />
    </Suspense>
  );
}

async function NewJobContent() {
  const user = await requireUser();
  if (!(await getWalletStatus(user.id)).connected) redirect("/connect-wallet");
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 py-8">
      <Link href="/jobs" className="text-indigo font-semibold underline">
        Back to jobs
      </Link>
      <h1 className="font-display text-h1 text-ink font-extrabold">Create job</h1>
      <JobForm defaultCurrency="NGN" />
    </main>
  );
}

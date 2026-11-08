"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { createJob } from "@/lib/jobs/create-job";
import { parseJobInput, type JobInputField } from "@/lib/jobs/job-input";
import { PrismaJobStore } from "@/lib/jobs/prisma-job-store";
import { rateLimit } from "@/lib/rate-limit";
import { ensureSellerProfile, getWalletStatus } from "@/lib/sellers/seller-profile";

export type CreateJobState =
  | { status: "idle" }
  | { status: "error"; message?: string; fields: Partial<Record<JobInputField, string>> };

const TEN_MINUTES = 10 * 60_000;

export async function createJobAction(
  _previous: CreateJobState,
  formData: FormData,
): Promise<CreateJobState> {
  const user = await requireUser();

  const limit = rateLimit(`create-job:${user.id}`, 20, TEN_MINUTES);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      fields: {},
      message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
    };
  }

  // A job without a wallet could never produce an invoice, so stop before saving it.
  if (!(await getWalletStatus(user.id)).connected) redirect("/connect-wallet");

  const parsed = parseJobInput(Object.fromEntries(formData));
  if (!parsed.ok) return { status: "error", fields: parsed.errors };

  const profile = await ensureSellerProfile(user);
  const job = await createJob(PrismaJobStore.create(), profile.id, parsed.value);
  redirect(`/jobs/${job.id}`);
}

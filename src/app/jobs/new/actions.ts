"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { createJob } from "@/lib/jobs/create-job";
import { parseJobInput, type JobInputField } from "@/lib/jobs/job-input";
import { PrismaJobStore } from "@/lib/jobs/prisma-job-store";
import { rateLimit } from "@/lib/rate-limit";
import { DEMO_MAX_JOBS } from "@/lib/demo/limits";
import { ensureSellerProfile, getWalletStatus, isDemoSeller } from "@/lib/sellers/seller-profile";

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
  if (await isDemoSeller(user.id)) {
    const count = await getDb().job.count({ where: { sellerId: profile.id } });
    if (count >= DEMO_MAX_JOBS) {
      return {
        status: "error",
        fields: {},
        message: `The demo allows ${DEMO_MAX_JOBS} jobs. Use one of the ones you have.`,
      };
    }
  }
  const job = await createJob(PrismaJobStore.create(), profile.id, parsed.value);
  redirect(`/jobs/${job.id}`);
}

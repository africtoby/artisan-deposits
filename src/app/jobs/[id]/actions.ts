"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { PrismaJobStore } from "@/lib/jobs/prisma-job-store";
import {
  performSellerAction,
  requestBalance,
  saveDeliveryLink,
  SellerActionError,
} from "@/lib/jobs/seller-actions";
import { getRate } from "@/lib/rates/get-rate";
import { rateLimit } from "@/lib/rate-limit";
import { ensureSellerProfile, openWalletForSeller } from "@/lib/sellers/seller-profile";

export type JobActionState =
  { status: "idle" } | { status: "error"; message: string } | { status: "done" };

const TEN_MINUTES = 10 * 60_000;

const formSchema = z.object({
  jobId: z.uuid(),
  action: z.enum(["start-work", "mark-ready", "mark-done", "cancel", "request-balance"]),
});

// Turns a failure into one calm line. Expected rule failures carry their own message; anything
// else (wallet offline, rates down) is logged by name only and shown generically.
function describe(error: unknown): string {
  if (error instanceof SellerActionError) return error.message;
  console.error("job action failed:", error instanceof Error ? error.name : error);
  return "Couldn't finish that. Check your wallet is online and try again in a minute.";
}

function tooMany(retryAfterSeconds: number): JobActionState {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return {
    status: "error",
    message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
  };
}

export async function jobAction(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const user = await requireUser();
  const limit = rateLimit(`job-action:${user.id}`, 60, TEN_MINUTES);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const parsed = formSchema.safeParse({
    jobId: formData.get("jobId"),
    action: formData.get("action"),
  });
  if (!parsed.success) return { status: "error", message: "That request was not valid." };
  const { jobId, action } = parsed.data;

  const profile = await ensureSellerProfile(user);
  const store = PrismaJobStore.create();
  try {
    if (action === "request-balance") {
      const wallet = await openWalletForSeller(user.id);
      if (!wallet) return { status: "error", message: "Connect your wallet first." };
      try {
        await requestBalance({ store, wallet, getRate }, profile.id, jobId);
      } finally {
        wallet.close();
      }
    } else {
      await performSellerAction(store, profile.id, jobId, action);
    }
  } catch (error) {
    return { status: "error", message: describe(error) };
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { status: "done" };
}

export async function deliveryLinkAction(
  _previous: JobActionState,
  formData: FormData,
): Promise<JobActionState> {
  const user = await requireUser();
  const limit = rateLimit(`job-action:${user.id}`, 60, TEN_MINUTES);
  if (!limit.allowed) return tooMany(limit.retryAfterSeconds);

  const jobId = z.uuid().safeParse(formData.get("jobId"));
  if (!jobId.success) return { status: "error", message: "That request was not valid." };

  const profile = await ensureSellerProfile(user);
  try {
    await saveDeliveryLink(PrismaJobStore.create(), profile.id, jobId.data, formData.get("url"));
  } catch (error) {
    return { status: "error", message: describe(error) };
  }
  revalidatePath(`/jobs/${jobId.data}`);
  return { status: "done" };
}

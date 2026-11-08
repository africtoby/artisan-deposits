"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { clientIpFrom } from "@/lib/client-ip";
import { getDb } from "@/lib/db";
import { deleteExpiredDemoSellers } from "@/lib/demo/demo-cleanup";
import { DEMO_STARTS_PER_IP } from "@/lib/demo/limits";
import { seedDemoJobs } from "@/lib/demo/seed-demo";
import { PrismaJobStore } from "@/lib/jobs/prisma-job-store";
import { rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StartDemoState = { status: "idle" } | { status: "error"; message: string };

const TEN_MINUTES = 10 * 60_000;

export async function startDemoAction(): Promise<StartDemoState> {
  // Someone already signed in keeps their session: replacing it would log a real seller out.
  if (await getCurrentUser()) redirect("/jobs");

  const ip = clientIpFrom(await headers());
  const limit = rateLimit(`demo-start:${ip}`, DEMO_STARTS_PER_IP, TEN_MINUTES);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
    };
  }

  await deleteExpiredDemoSellers();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    // Most likely "Allow anonymous sign-ins" is still off in Supabase. Not shown to the visitor.
    console.error("demo sign-in failed:", error?.code ?? "no user");
    return { status: "error", message: "The demo is not available right now. Try again soon." };
  }

  const profile = await getDb().sellerProfile.create({
    data: { userId: data.user.id, displayName: "Demo seller", isDemo: true },
    select: { id: true },
  });
  await seedDemoJobs(PrismaJobStore.create(), profile.id);
  redirect("/jobs");
}

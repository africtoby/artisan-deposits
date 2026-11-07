"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState =
  { status: "idle" } | { status: "error"; message: string } | { status: "sent"; email: string };

const emailSchema = z.email().max(254);
const FIFTEEN_MINUTES = 15 * 60_000;

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const raw = formData.get("email");
  const parsed = emailSchema.safeParse(typeof raw === "string" ? raw.trim().toLowerCase() : "");
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address, like name@example.com." };
  }
  const email = parsed.data;

  // Two limits: per address (stops someone flooding one inbox) and per network address.
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const byEmail = rateLimit(`sign-in-email:${email}`, 3, FIFTEEN_MINUTES);
  const byIp = rateLimit(`sign-in-ip:${ip}`, 20, FIFTEEN_MINUTES);
  const blocked = !byEmail.allowed ? byEmail : !byIp.allowed ? byIp : null;
  if (blocked && !blocked.allowed) {
    const minutes = Math.max(1, Math.ceil(blocked.retryAfterSeconds / 60));
    return {
      status: "error",
      message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${getPublicEnv().NEXT_PUBLIC_APP_URL}/auth/confirm` },
  });
  if (error) {
    // The raw message is not shown: it can reveal how Supabase is set up.
    return { status: "error", message: "We could not send the link. Wait a minute and try again." };
  }
  return { status: "sent", email };
}

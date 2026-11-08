"use server";

import { requireUser } from "@/lib/auth/current-user";
import { createAnthropicDraftModel } from "@/lib/ai/anthropic-draft-model";
import { DraftError, parseJobMessage, type JobDraft } from "@/lib/ai/parse-job";
import { getServerEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export type FillState =
  | { status: "idle" }
  | { status: "error"; message: string }
  // `version` changes on every answer so the form below reloads with the new values.
  | { status: "draft"; draft: JobDraft; version: number };

const TEN_MINUTES = 10 * 60_000;

export async function fillFromMessageAction(
  _previous: FillState,
  formData: FormData,
): Promise<FillState> {
  const user = await requireUser();

  // Off means off: with the flag down this action does nothing, even if someone calls it.
  const env = getServerEnv();
  if (!env.AI_INTAKE_ENABLED || !env.ANTHROPIC_API_KEY) {
    return {
      status: "error",
      message: "Fill from message is not available. Fill in the form by hand.",
    };
  }

  const limit = rateLimit(`ai-intake:${user.id}`, 10, TEN_MINUTES);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
    };
  }

  const raw = formData.get("message");
  const today = new Date().toISOString().slice(0, 10);
  try {
    const draft = await parseJobMessage(
      createAnthropicDraftModel(env.ANTHROPIC_API_KEY),
      typeof raw === "string" ? raw : "",
      today,
    );
    return { status: "draft", draft, version: Date.now() };
  } catch (error) {
    if (error instanceof DraftError) return { status: "error", message: error.message };
    // Logged by name only: the SDK's messages can echo request details.
    console.error("fill from message failed:", error instanceof Error ? error.name : error);
    return {
      status: "error",
      message: "Couldn't read that message just now. Try again, or fill in the form by hand.",
    };
  }
}

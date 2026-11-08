"use client";

import { ClipboardPaste } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/button";
import { fillFromMessageAction, type FillState } from "./fill-actions";
import { JobForm } from "./job-form";

const initial: FillState = { status: "idle" };

export function NewJobClient({ aiEnabled }: { aiEnabled: boolean }) {
  const [fill, fillAction, pending] = useActionState(fillFromMessageAction, initial);
  const draft = fill.status === "draft" ? fill.draft : undefined;

  return (
    <div className="flex flex-col gap-8">
      {aiEnabled && (
        <form action={fillAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-ink font-semibold">
              Client message
            </label>
            <p id="message-hint" className="text-small text-ink-soft">
              Paste a WhatsApp message, email or brief. We fill in the form below. You check every
              field before anything is saved.
            </p>
            <textarea
              id="message"
              name="message"
              rows={5}
              maxLength={4000}
              aria-describedby="message-hint"
              className="rounded-control bg-surface text-body text-ink border-ink-soft w-full border-[1.5px] px-4 py-3"
            />
          </div>
          {fill.status === "error" && (
            <p role="alert" className="text-small text-error">
              {fill.message}
            </p>
          )}
          <div>
            <Button type="submit" variant="secondary" loading={pending}>
              <ClipboardPaste size={20} strokeWidth={1.5} aria-hidden />
              Fill from message
            </Button>
          </div>
          {draft && (
            <p role="status" className="text-small text-ink">
              Form filled from the message. Check the name, price and deposit before you create the
              job.
            </p>
          )}
        </form>
      )}

      <JobForm
        key={fill.status === "draft" ? fill.version : "manual"}
        defaultCurrency="NGN"
        draft={draft}
      />
    </div>
  );
}

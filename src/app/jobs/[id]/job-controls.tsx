"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { deliveryLinkAction, jobAction, type JobActionState } from "./actions";

const initial: JobActionState = { status: "idle" };

type Step = { action: string; label: string };

// The one forward step the seller can take, if any. Everything else is waiting on the client.
function nextStep(status: string, balanceIsZero: boolean): Step | null {
  switch (status) {
    case "deposit_paid":
      return { action: "start-work", label: "Start work" };
    case "in_progress":
      return { action: "mark-ready", label: "Mark ready" };
    case "ready":
      return balanceIsZero
        ? { action: "mark-done", label: "Mark done" }
        : { action: "request-balance", label: "Request balance" };
    default:
      return null;
  }
}

const WAITING_TEXT: Record<string, string> = {
  created: "Waiting for the client to open the link and pay the deposit.",
  deposit_pending: "Waiting for the client to pay the deposit.",
  balance_pending: "Balance requested. Waiting for the client to pay it.",
  completed: "Everything is paid. The client can open the delivery link.",
  cancelled: "This job was cancelled.",
};

export function JobControls({
  jobId,
  status,
  balanceIsZero,
}: {
  jobId: string;
  status: string;
  balanceIsZero: boolean;
}) {
  const [state, formAction, pending] = useActionState(jobAction, initial);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const step = nextStep(status, balanceIsZero);
  const canCancel = status !== "completed" && status !== "cancelled";

  return (
    <div className="flex flex-col gap-4">
      {step ? (
        <form action={formAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="action" value={step.action} />
          <Button type="submit" fullWidth loading={pending}>
            {step.label}
          </Button>
        </form>
      ) : (
        <p className="text-ink">{WAITING_TEXT[status]}</p>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-small text-error">
          {state.message}
        </p>
      )}

      {canCancel &&
        (confirmingCancel ? (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="action" value="cancel" />
            <p className="text-ink">
              Cancel this job? The client link stops accepting payment. Money already paid stays in
              your wallet, so any refund is between you and the client.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="danger" fullWidth loading={pending}>
                Cancel job
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setConfirmingCancel(false)}>
                Keep job
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setConfirmingCancel(true)}>
              Cancel job
            </Button>
          </div>
        ))}
    </div>
  );
}

export function DeliveryLinkForm({ jobId, current }: { jobId: string; current: string | null }) {
  const [state, formAction, pending] = useActionState(deliveryLinkAction, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={jobId} />
      <Input
        label="Link to the finished files"
        name="url"
        type="url"
        inputMode="url"
        autoComplete="off"
        defaultValue={current ?? ""}
        hint="Must start with https://. Your client sees it only after everything is paid."
        error={state.status === "error" ? state.message : undefined}
      />
      <Button type="submit" variant="secondary" loading={pending}>
        Save link
      </Button>
      <p role="status" className="text-small text-ink-soft min-h-5">
        {state.status === "done" ? "Link saved" : ""}
      </p>
    </form>
  );
}

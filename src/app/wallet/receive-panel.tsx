"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { PaymentSlip } from "@/components/payment-slip";
import { Tape } from "@/components/tape";
import { formatSats } from "@/lib/money/currencies";
import { receiveAction, type ReceiveState } from "./actions";

const initial: ReceiveState = { status: "idle" };

export function ReceivePanel() {
  const [state, formAction, pending] = useActionState(receiveAction, initial);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        <Input
          label="Amount in sats"
          name="amount"
          inputMode="numeric"
          autoComplete="off"
          required
          error={state.status === "error" ? state.message : undefined}
        />
        <Button type="submit" fullWidth loading={pending}>
          Receive
        </Button>
      </form>

      {state.status === "invoice" && (
        // Keyed by the invoice so a second invoice restarts the countdown.
        <div key={state.bolt11} className="flex flex-col gap-4">
          <Tape mode="countdown" expiresAt={state.expiresAt} />
          <p className="font-display text-h2 text-ink font-extrabold tabular-nums">
            {formatSats(BigInt(state.amountSats))} sats
          </p>
          <PaymentSlip bolt11={state.bolt11} state="open" />
        </div>
      )}
    </div>
  );
}

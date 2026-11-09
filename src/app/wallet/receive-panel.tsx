"use client";

import { useActionState, useState } from "react";
import { AmountDisplay } from "@/components/amount-display";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { PaymentSlip } from "@/components/payment-slip";
import { Tape } from "@/components/tape";
import { fiatToSats, parseMajorToMinor } from "@/lib/money/convert";
import { formatSats, type CurrencyCode } from "@/lib/money/currencies";
import { receiveAction, type ReceiveState } from "./actions";

const initial: ReceiveState = { status: "idle" };

type ReceivePanelProps = {
  currency: CurrencyCode;
  // Today's rate, only for the preview line. The invoice is priced again on the server.
  rate: string | null;
};

export function ReceivePanel({ currency, rate }: ReceivePanelProps) {
  const [state, formAction, pending] = useActionState(receiveAction, initial);
  const [typed, setTyped] = useState("");

  const minor = parseMajorToMinor(typed, currency);
  const previewSats = rate && minor && minor > 0n ? fiatToSats(minor, currency, rate) : null;

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Input
            label={`Amount in ${currency}`}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="5000"
            required
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            error={state.status === "error" ? state.message : undefined}
          />
          {/* Polite, so a screen reader hears the new figure once typing pauses. */}
          <p role="status" className="text-small text-ink-soft min-h-5 tabular-nums">
            {previewSats !== null ? `about ${formatSats(previewSats)} sats` : ""}
          </p>
        </div>
        <Button type="submit" fullWidth loading={pending}>
          Make invoice
        </Button>
      </form>

      {state.status === "invoice" && (
        // Keyed by the invoice so a second invoice restarts the countdown.
        <div key={state.bolt11} className="flex flex-col gap-4">
          <Tape mode="countdown" expiresAt={state.expiresAt} />
          <AmountDisplay
            amountMinor={BigInt(state.fiatMinor)}
            currency={state.currency}
            sats={BigInt(state.amountSats)}
          />
          <PaymentSlip bolt11={state.bolt11} state="open" />
        </div>
      )}
    </div>
  );
}

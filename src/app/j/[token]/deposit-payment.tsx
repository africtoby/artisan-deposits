"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AmountDisplay } from "@/components/amount-display";
import { PaymentSlip } from "@/components/payment-slip";
import { Tag } from "@/components/tag";
import { Tape } from "@/components/tape";
import type { ClientDepositState } from "@/lib/jobs/client-deposit";
import { tapeProgress } from "@/lib/jobs/tape-stages";
import { isCurrencyCode } from "@/lib/money/currencies";

const POLL_EVERY_MS = 4000;

type DepositPaymentProps = {
  token: string;
  title: string;
  clientName: string;
  currency: string;
  priceMinor: string;
  depositMinor: string;
  initial: ClientDepositState;
};

export function DepositPayment(props: DepositPaymentProps) {
  const { token, title, clientName, initial } = props;
  const [state, setState] = useState<ClientDepositState>(initial);
  const [stale, setStale] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch(`/j/${token}/status`, { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setState((await response.json()) as ClientDepositState);
      setStale(false);
    } catch {
      // Keep showing the last good invoice; a dropped connection should not blank the QR.
      setStale(true);
    } finally {
      inFlight.current = false;
    }
  }, [token]);

  const finished = state.kind !== "open";
  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => void refresh(), POLL_EVERY_MS);
    return () => clearInterval(timer);
  }, [finished, refresh]);

  if (!isCurrencyCode(props.currency)) return null;
  const currency = props.currency;
  const balanceIsZero = props.priceMinor === props.depositMinor;

  return (
    <div className="flex flex-col gap-6">
      {state.kind === "open" ? (
        <Tape mode="countdown" expiresAt={state.expiresAt} onExpire={() => void refresh()} />
      ) : (
        <Tape
          mode="progress"
          progress={tapeProgress(
            state.kind === "paid" ? "deposit_paid" : "cancelled",
            balanceIsZero,
          )}
        />
      )}

      <div className="flex flex-col gap-6 px-4">
        <p className="text-ink">
          {clientName}, deposit for <strong className="font-semibold">{title}</strong>
        </p>

        {state.kind === "open" && (
          <>
            <AmountDisplay
              amountMinor={BigInt(state.fiatMinor)}
              currency={currency}
              sats={BigInt(state.amountSats)}
            />
            <PaymentSlip bolt11={state.bolt11} state="open" />
            <p role="status" className="text-small text-ink-soft">
              {stale
                ? "Can't check for payment right now. Trying again."
                : "Waiting for payment. This page updates by itself."}
            </p>
          </>
        )}

        {state.kind === "paid" && (
          <div className="flex flex-col gap-4">
            <AmountDisplay amountMinor={BigInt(props.depositMinor)} currency={currency} />
            <PaymentSlip bolt11="" state="paid" />
            <div role="status" className="flex flex-col items-start gap-2">
              <Tag kind="paid" />
              <p className="text-ink">Deposit received. The work can start.</p>
            </div>
          </div>
        )}

        {state.kind === "cancelled" && (
          <div role="status" className="flex flex-col items-start gap-2">
            <Tag kind="cancelled" />
            <p className="text-ink">
              This job was cancelled. Do not pay. Ask the seller if unsure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

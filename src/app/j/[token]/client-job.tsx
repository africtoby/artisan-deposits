"use client";

import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AmountDisplay } from "@/components/amount-display";
import { PaymentSlip } from "@/components/payment-slip";
import { Tag } from "@/components/tag";
import { Tape } from "@/components/tape";
import { buttonClasses } from "@/components/button";
import type { ClientJobState } from "@/lib/jobs/client-job";
import { tapeProgress } from "@/lib/jobs/tape-stages";
import { formatMinor, isCurrencyCode } from "@/lib/money/currencies";

const PAY_POLL_MS = 4000;
const WAIT_POLL_MS = 10_000;

// Fixed to UTC so the server and the browser print the same text.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

type ClientJobProps = {
  token: string;
  title: string;
  clientName: string;
  currency: string;
  priceMinor: string;
  depositMinor: string;
  initial: ClientJobState;
};

const STATUS_TEXT: Record<string, string> = {
  deposit_paid: "Deposit received. The work can start.",
  in_progress: "The work is in progress.",
  ready: "The work is ready.",
  balance_pending: "The balance is due.",
  completed: "Everything is paid. Thank you.",
};

export function ClientJob(props: ClientJobProps) {
  const { token, title, clientName, initial } = props;
  const [state, setState] = useState<ClientJobState>(initial);
  const [stale, setStale] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const inFlight = useRef(false);
  const wasOpen = useRef(initial.payment.kind === "open");

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch(`/j/${token}/status`, { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const next = (await response.json()) as ClientJobState;
      // The green check plays once, at the moment an open invoice stops being open.
      if (wasOpen.current && next.payment.kind !== "open" && next.status !== "cancelled") {
        setJustPaid(true);
      }
      wasOpen.current = next.payment.kind === "open";
      setState(next);
      setStale(false);
    } catch {
      // Keep showing the last good page; a dropped connection should not blank the QR.
      setStale(true);
    } finally {
      inFlight.current = false;
    }
  }, [token]);

  const finished = state.status === "completed" || state.status === "cancelled";
  const paying = state.payment.kind === "open";
  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => void refresh(), paying ? PAY_POLL_MS : WAIT_POLL_MS);
    return () => clearInterval(timer);
  }, [finished, paying, refresh]);

  if (!isCurrencyCode(props.currency)) return null;
  const currency = props.currency;
  const balanceIsZero = props.priceMinor === props.depositMinor;
  const payment = state.payment;

  return (
    <div className="flex flex-col gap-6">
      {payment.kind === "open" ? (
        <Tape mode="countdown" expiresAt={payment.expiresAt} onExpire={() => void refresh()} />
      ) : (
        <Tape mode="progress" progress={tapeProgress(state.status, balanceIsZero)} />
      )}

      <div className="flex flex-col gap-6 px-4">
        <p className="text-ink">
          {clientName},{" "}
          {payment.kind === "open" && payment.purpose === "balance" ? "balance" : "deposit"} for{" "}
          <strong className="font-semibold">{title}</strong>
        </p>

        {payment.kind === "open" && (
          <>
            <AmountDisplay
              amountMinor={BigInt(payment.fiatMinor)}
              currency={currency}
              sats={BigInt(payment.amountSats)}
            />
            <PaymentSlip bolt11={payment.bolt11} state="open" />
            <p role="status" className="text-small text-ink-soft">
              {stale
                ? "Can't check for payment right now. Trying again."
                : "Waiting for payment. This page updates by itself."}
            </p>
          </>
        )}

        {payment.kind !== "open" && (
          <div className="flex flex-col gap-4">
            {justPaid && state.status !== "cancelled" && <PaymentSlip bolt11="" state="paid" />}
            <div role="status" className="flex flex-col items-start gap-2">
              {state.status === "cancelled" ? (
                <>
                  <Tag kind="cancelled" />
                  <p className="text-ink">
                    This job was cancelled. Do not pay. Ask the seller if unsure.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-ink font-semibold">{STATUS_TEXT[state.status]}</p>
                  {state.status === "ready" && !balanceIsZero && (
                    <p className="text-ink">
                      The seller will send the balance of{" "}
                      {formatMinor(BigInt(props.priceMinor) - BigInt(props.depositMinor), currency)}
                      . This page shows it when it is ready.
                    </p>
                  )}
                </>
              )}
            </div>
            {stale && (
              <p className="text-small text-ink-soft">
                Can&apos;t refresh right now. Trying again.
              </p>
            )}
          </div>
        )}

        {state.status === "completed" && state.deliveryUrl && (
          <section aria-labelledby="delivery" className="flex flex-col gap-2">
            <h2 id="delivery" className="font-display text-h2 text-ink font-extrabold">
              Your files
            </h2>
            <p className="text-small text-ink-soft">
              This link goes to {new URL(state.deliveryUrl).hostname}. Only open it if you expect
              files from the seller.
            </p>
            <a
              href={state.deliveryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", true)}
            >
              Open files
              <ExternalLink size={20} strokeWidth={1.5} aria-hidden />
            </a>
          </section>
        )}

        <section aria-labelledby="timeline" className="flex flex-col gap-2">
          <h2 id="timeline" className="font-display text-h2 text-ink font-extrabold">
            Progress
          </h2>
          <ol className="border-dye-line border-t">
            {state.timeline.map((entry, index) => (
              <li
                key={`${entry.label}-${index}`}
                className="border-dye-line bg-surface flex min-h-12 items-center justify-between gap-4 border-b px-4 py-2"
              >
                <span className="text-ink font-semibold">{entry.label}</span>
                <span className="text-small text-ink-soft tabular-nums">
                  {dateFormat.format(new Date(entry.at))} UTC
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

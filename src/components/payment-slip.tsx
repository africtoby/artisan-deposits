"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button, buttonClasses } from "./button";
import { cn } from "@/lib/cn";

type PaymentSlipProps = {
  bolt11: string;
  state: "open" | "paid" | "expired";
  onMakeNew?: () => void;
};

export function PaymentSlip({ bolt11, state, onMakeNew }: PaymentSlipProps) {
  const [copied, setCopied] = useState(false);

  async function copyInvoice() {
    try {
      await navigator.clipboard.writeText(bolt11);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (older browsers, embedded views); the QR still works.
      setCopied(false);
    }
  }

  if (state === "paid") {
    return (
      <div className="rounded-control border-ink-soft bg-surface flex items-center gap-3 border-[1.5px] p-4">
        <svg viewBox="0 0 24 24" width={40} height={40} aria-hidden fill="none">
          <circle cx="12" cy="12" r="11" stroke="var(--paid)" strokeWidth="1.5" />
          <path
            d="M7 12.5l3.2 3.2L17 8.8"
            stroke="var(--paid)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="check-draw"
          />
        </svg>
        <p className="text-paid font-semibold">Paid</p>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="rounded-control border-ink-soft bg-surface flex flex-col items-start gap-4 border-[1.5px] p-4">
        <p className="text-ink">This invoice expired. Make a new one.</p>
        <Button onClick={onMakeNew}>Make new invoice</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-control border-ink-soft bg-surface flex justify-center border-[1.5px] p-4">
        {/* Upper case lets the QR use a denser alphanumeric mode, so it scans on cheap cameras. */}
        <QRCodeSVG
          value={bolt11.toUpperCase()}
          size={240}
          level="M"
          marginSize={0}
          fgColor="var(--ink)"
          bgColor="var(--surface)"
          role="img"
          aria-label="Lightning invoice QR code"
          className="size-auto max-w-full"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={`lightning:${bolt11}`} className={cn(buttonClasses("primary", true))}>
          Open in wallet
        </a>
        <Button variant="secondary" fullWidth onClick={copyInvoice}>
          Copy invoice
        </Button>
      </div>
      <p role="status" className="text-small text-ink-soft min-h-5">
        {copied ? "Invoice copied" : ""}
      </p>
    </div>
  );
}

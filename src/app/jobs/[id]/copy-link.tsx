"use client";

import { useState } from "react";
import { Button } from "@/components/button";

type ClientLinkActionsProps = {
  path: string;
  clientName: string;
  title: string;
  // The page has only one main button. When the seller has a job step to take, that one is the
  // main button and these two step back.
  quiet: boolean;
};

export function ClientLinkActions({ path, clientName, title, quiet }: ClientLinkActionsProps) {
  const [copied, setCopied] = useState(false);

  // Built in the browser so the link always matches the address the seller is using.
  const fullLink = () => `${window.location.origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function share() {
    const message = `Hi ${clientName}, follow and pay for "${title}" here: ${fullLink()}`;
    // noopener keeps the new tab from reaching back into this page.
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant={quiet ? "secondary" : "primary"} fullWidth onClick={copy}>
          Copy client link
        </Button>
        <Button variant="secondary" fullWidth onClick={share}>
          Share on WhatsApp
        </Button>
      </div>
      <p role="status" className="text-small text-ink-soft min-h-5">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}

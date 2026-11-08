"use client";

import { useState } from "react";
import { Button } from "@/components/button";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // Built in the browser so the link always matches the address the seller is using.
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={copy}>Copy client link</Button>
      <p role="status" className="text-small text-ink-soft min-h-5">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}

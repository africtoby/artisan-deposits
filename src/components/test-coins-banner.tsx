import { FlaskConical } from "lucide-react";

// Plain bordered note, no yellow: yellow is reserved for the tape and the Owed tag.
export function TestCoinsBanner() {
  return (
    <p className="rounded-control border-ink-soft bg-surface text-small text-ink flex items-center gap-2 border-[1.5px] px-4 py-3">
      <FlaskConical size={18} strokeWidth={1.5} aria-hidden className="shrink-0" />
      Test coins. No real money moves.
    </p>
  );
}

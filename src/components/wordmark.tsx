import { cn } from "@/lib/cn";
import { BrandMark } from "./brand-mark";

// The tape-yellow mark, then the name. The name is white on the ink sign-in screen, indigo
// everywhere else; the mark keeps its own colors on both.
export function Wordmark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-h2 inline-flex items-center gap-2 font-extrabold",
        onDark ? "text-surface" : "text-indigo",
        className,
      )}
    >
      <BrandMark />
      Work Deposits
    </span>
  );
}

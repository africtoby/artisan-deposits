import { cn } from "@/lib/cn";

// Text only, no logo symbol. White on the ink sign-in screen, indigo everywhere else.
export function Wordmark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-h2 font-extrabold",
        onDark ? "text-surface" : "text-indigo",
        className,
      )}
    >
      Work Deposits
    </span>
  );
}

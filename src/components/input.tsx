import { CircleAlert } from "lucide-react";
import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

// The label sits above the field, always visible (a placeholder is not a label).
// The border is ink-soft, not dye-line: dye-line is too faint to be the only edge of an input.
export function Input({ label, hint, error, className, ...rest }: InputProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-small text-ink-soft">
          {hint}
        </p>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "rounded-control bg-surface text-body text-ink min-h-12 w-full border-[1.5px] px-4",
          "disabled:opacity-50",
          error ? "border-error" : "border-ink-soft",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-small text-error flex items-start gap-1.5">
          <CircleAlert size={18} strokeWidth={1.5} aria-hidden className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

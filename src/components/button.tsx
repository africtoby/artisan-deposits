import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "danger";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-body font-semibold " +
  "transition-colors disabled:opacity-50 aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-indigo text-surface hover:bg-ink",
  secondary: "border-[1.5px] border-ink-soft bg-surface text-ink hover:bg-ground",
  danger: "border-[1.5px] border-ink-soft bg-surface text-error hover:bg-error-tint",
};

export function buttonClasses(variant: ButtonVariant = "primary", fullWidth = false): string {
  return cn(base, variants[variant], fullWidth && "w-full");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  // Keeps the label (so the width does not jump) and blocks a second tap while working.
  loading?: boolean;
};

export function Button({
  variant = "primary",
  fullWidth,
  loading,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses(variant, fullWidth), className)}
      {...rest}
    >
      {loading && (
        <LoaderCircle
          size={20}
          strokeWidth={1.5}
          aria-hidden
          className="motion-safe:animate-spin"
        />
      )}
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

// A link that looks like a button, for navigation. Real actions use <Button>.
export function ButtonLink({
  href,
  variant = "primary",
  fullWidth,
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(buttonClasses(variant, fullWidth), className)}>
      {children}
    </Link>
  );
}

// Joins class names, skipping anything falsy. Enough for us; no need for a library.
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

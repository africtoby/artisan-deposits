// After sign-in we send the person on to a "next" page named in the link. That value comes from
// the URL, so anyone can craft it; accepting only a plain in-app path stops a sign-in link from
// bouncing a seller to a look-alike site (an open redirect).
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/connect-wallet",
): string {
  if (!value) return fallback;
  // Must start with a single slash. "//evil.com" and "/\evil.com" are read by browsers as other hosts.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

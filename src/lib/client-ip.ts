// The visitor's network address, for rate limits only. On Vercel the platform sets these headers
// itself and replaces any value the visitor sends, so they can be trusted there. Elsewhere
// x-forwarded-for can be faked, which only weakens a rate limit and never gates access to data.
export function clientIpFrom(headers: Pick<Headers, "get">): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  const real = headers.get("x-real-ip");
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0];
  return (vercel ?? real ?? forwarded)?.trim() || "unknown";
}

import { loadClientJob } from "@/lib/jobs/client-page";

// POST because every call may make an invoice. The browser polls this every few seconds.
export async function POST(_request: Request, ctx: RouteContext<"/j/[token]/status">) {
  const { token } = await ctx.params;
  const result = await loadClientJob(token);
  if (result.ok)
    return Response.json(result.view.state, { headers: { "Cache-Control": "no-store" } });
  const status = result.reason === "not-found" ? 404 : result.reason === "busy" ? 429 : 503;
  return Response.json(
    { error: result.reason },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

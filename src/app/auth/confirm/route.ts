import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Where the magic link in the email lands. It supports both link styles Supabase can send:
// `token_hash` (works even if the email is opened in a different browser than the one that asked,
// which is common on phones) and `code` (works only in the same browser).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  const supabase = await createSupabaseServerClient();
  let failed = true;

  if (tokenHash && searchParams.get("type") === "email") {
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }

  const destination = failed ? "/sign-in?error=link" : next;
  return NextResponse.redirect(new URL(destination, request.url));
}

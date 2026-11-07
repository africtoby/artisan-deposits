import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

// Keeps the sign-in cookie fresh. Access tokens last about an hour; without this a seller
// would be signed out mid-job. It does not decide who may see what: pages check that
// themselves (see current-user.ts), because a proxy is not a safe place for access control.
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Reading the claims is what triggers a refresh when the token is close to expiry.
  await supabase.auth.getClaims();
  return response;
}

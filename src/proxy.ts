import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/refresh-session";

export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Skipped on purpose: static files, the /brand design page, and client payment pages
  // (/j/...), which never involve a sign-in and should not wait on the auth server.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|j/).*)"],
};

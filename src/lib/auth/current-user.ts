import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

// getUser() asks the Supabase server to vouch for the token. Unlike reading the cookie alone,
// it cannot be fooled by a forged cookie. `cache` makes repeat calls in one request free.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

// Every seller page and server action starts with this. It is the check that the person is who
// they say, and the user id it returns is what every database lookup must be filtered by.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

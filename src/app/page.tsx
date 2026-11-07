import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";

// Until the jobs list exists (Phase 3), signed-in sellers land on the wallet connection page.
export default function HomePage() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}

async function Redirector(): Promise<never> {
  const user = await getCurrentUser();
  redirect(user ? "/connect-wallet" : "/sign-in");
}

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";

// Signed-in sellers land on their job list.
export default function HomePage() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}

async function Redirector(): Promise<never> {
  const user = await getCurrentUser();
  redirect(user ? "/jobs" : "/sign-in");
}

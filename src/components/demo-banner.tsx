import { getCurrentUser } from "@/lib/auth/current-user";
import { isDemoSeller } from "@/lib/sellers/seller-profile";
import { TestCoinsBanner } from "./test-coins-banner";

// Shown on seller screens only for the /demo seller, so the practice coins are never mistaken
// for real money.
export async function DemoBanner() {
  const user = await getCurrentUser();
  if (!user || !(await isDemoSeller(user.id))) return null;
  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pt-4">
      <TestCoinsBanner />
    </div>
  );
}

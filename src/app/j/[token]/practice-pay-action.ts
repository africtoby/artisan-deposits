"use server";

import { DemoWalletProvider } from "@/lib/demo/demo-wallet";
import { PrismaDemoWalletStore } from "@/lib/demo/prisma-demo-wallet-store";
import { practicePay } from "@/lib/demo/practice-pay";
import { PrismaJobStore } from "@/lib/jobs/prisma-job-store";
import { isWellFormedToken } from "@/lib/jobs/public-token";
import { rateLimit } from "@/lib/rate-limit";
import { isDemoProfile } from "@/lib/sellers/seller-profile";

// Only the token comes from the browser. A real seller's job is refused here, so this button
// can never settle anything but practice coins.
export async function practicePayAction(token: string): Promise<{ ok: boolean }> {
  if (!isWellFormedToken(token)) return { ok: false };
  if (!rateLimit(`practice-pay:${token}`, 20, 60_000).allowed) return { ok: false };

  const store = PrismaJobStore.create();
  const job = await store.findJobByToken(token);
  if (!job || !(await isDemoProfile(job.sellerId))) return { ok: false };

  const wallet = new DemoWalletProvider(new PrismaDemoWalletStore(job.sellerId));
  return { ok: (await practicePay(store, wallet, job.id)) === "paid" };
}

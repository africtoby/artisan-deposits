import "server-only";
import { getDb } from "@/lib/db";
import { DEMO_LIFETIME_HOURS } from "./limits";

// Demo data resets by expiry: old demo sellers go, and their jobs, invoices and practice
// invoices go with them (cascade). Real sellers are never touched because of the isDemo filter.
export async function deleteExpiredDemoSellers(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - DEMO_LIFETIME_HOURS * 3_600_000);
  const result = await getDb().sellerProfile.deleteMany({
    where: { isDemo: true, createdAt: { lt: cutoff } },
  });
  return result.count;
}

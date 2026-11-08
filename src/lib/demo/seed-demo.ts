import { createJob } from "@/lib/jobs/create-job";
import type { JobInput } from "@/lib/jobs/job-input";
import type { JobStore } from "@/lib/jobs/job-store";

// One artisan job and one freelancer job, so a judge sees both kinds of seller. Amounts are
// written in minor units (kobo, cents) like everywhere else; the tailor's 45,000 naira is
// 4,500,000 kobo.
export const DEMO_JOBS: JobInput[] = [
  {
    clientName: "Amaka",
    title: "Wedding aso-ebi, 4 outfits",
    details: "Four outfits in ankara. Fitting on Friday.",
    deadline: null,
    currency: "NGN",
    priceMinor: 4_500_000n,
    depositMinor: 2_000_000n,
  },
  {
    clientName: "Kojo",
    title: "Logo and brand sheet",
    details: "Logo, two colours, one page of rules. Files delivered as a link.",
    deadline: null,
    currency: "USD",
    priceMinor: 30_000n,
    depositMinor: 10_000n,
  },
];

export async function seedDemoJobs(store: JobStore, sellerId: string) {
  const created = [];
  for (const input of DEMO_JOBS) created.push(await createJob(store, sellerId, input));
  return created;
}

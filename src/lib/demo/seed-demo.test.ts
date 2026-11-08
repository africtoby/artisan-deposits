import { describe, expect, it } from "vitest";
import { MemoryJobStore } from "@/lib/jobs/memory-job-store";
import { MemoryDemoWalletStore, DemoWalletProvider } from "./demo-wallet";
import { practicePay } from "./practice-pay";
import { seedDemoJobs } from "./seed-demo";
import { createInvoice } from "@/lib/jobs/create-invoice";
import { refreshPayment } from "@/lib/jobs/client-payment";

describe("seedDemoJobs", () => {
  it("creates one artisan job and one freelancer job for the seller", async () => {
    const store = new MemoryJobStore();
    const jobs = await seedDemoJobs(store, "seller-1");
    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.currency)).toEqual(["NGN", "USD"]);
    expect(jobs.every((job) => job.sellerId === "seller-1" && job.status === "created")).toBe(true);
    expect(jobs.every((job) => job.depositMinor < job.priceMinor)).toBe(true);
  });
});

describe("practicePay", () => {
  const getRate = async () =>
    ({ rate: "100000000", source: "test", fetchedAt: new Date() }) as never;

  it("pays the open deposit and the normal polling records it once", async () => {
    const store = new MemoryJobStore();
    const wallet = new DemoWalletProvider(new MemoryDemoWalletStore());
    const [job] = await seedDemoJobs(store, "seller-1");
    if (!job) throw new Error("no job");
    const deps = { store, wallet, getRate };

    await createInvoice(deps, job.id, "deposit");
    expect(await practicePay(store, wallet, job.id)).toBe("paid");
    expect((await refreshPayment(deps, job.id, "deposit")).kind).toBe("paid");
    expect((await store.findJobById(job.id))?.status).toBe("deposit_paid");
    // A second tap finds nothing left to pay.
    expect(await practicePay(store, wallet, job.id)).toBe("nothing-to-pay");
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { FakeWalletProvider } from "@/lib/wallet/fake-wallet-provider";
import { loadClientJobState } from "./client-job";
import type { CreateInvoiceDeps } from "./create-invoice";
import { createJob } from "./create-job";
import type { JobInput } from "./job-input";
import type { JobRecord } from "./job-store";
import { MemoryJobStore } from "./memory-job-store";
import {
  performSellerAction,
  requestBalance,
  saveDeliveryLink,
  SellerActionError,
} from "./seller-actions";

const RATE = "100000000.00000000";
const SELLER = "seller-1";

const base: JobInput = {
  clientName: "Ada",
  title: "Wedding dress",
  details: "",
  deadline: null,
  currency: "NGN",
  priceMinor: 10_000_00n,
  depositMinor: 4_000_00n,
};

let store: MemoryJobStore;
let wallet: FakeWalletProvider;
let deps: CreateInvoiceDeps;

beforeEach(() => {
  store = new MemoryJobStore();
  wallet = new FakeWalletProvider();
  deps = { store, wallet, getRate: async () => ({ rate: RATE, source: "test" }) };
});

// Opens the open invoice for a job and pays it from the "client's" wallet.
async function clientPays(job: JobRecord) {
  const state = await loadClientJobState(deps, job.id);
  expect(state?.payment.kind).toBe("open");
  const pending = [...store.invoices.values()].find((invoice) => invoice.status === "pending");
  wallet.simulatePayment(pending!.paymentHash);
  await loadClientJobState(deps, job.id);
}

async function statusOf(job: JobRecord) {
  return (await store.findJobById(job.id))?.status;
}

describe("a job with a balance, start to finish", () => {
  let job: JobRecord;
  beforeEach(async () => {
    job = await createJob(store, SELLER, base);
  });

  it("walks every step and keeps the delivery link hidden until the balance is paid", async () => {
    await saveDeliveryLink(store, SELLER, job.id, "https://files.example.com/dress");

    await clientPays(job);
    expect(await statusOf(job)).toBe("deposit_paid");

    await performSellerAction(store, SELLER, job.id, "start-work");
    await performSellerAction(store, SELLER, job.id, "mark-ready");
    expect(await statusOf(job)).toBe("ready");

    await requestBalance(deps, SELLER, job.id);
    expect(await statusOf(job)).toBe("balance_pending");

    const waiting = await loadClientJobState(deps, job.id);
    expect(waiting?.payment).toMatchObject({
      kind: "open",
      purpose: "balance",
      fiatMinor: "600000",
    });
    expect(waiting?.deliveryUrl).toBeNull();

    await clientPays(job);
    const done = await loadClientJobState(deps, job.id);
    expect(done?.status).toBe("completed");
    expect(done?.deliveryUrl).toBe("https://files.example.com/dress");
    expect(done?.timeline.map((entry) => entry.label)).toEqual([
      "Job created",
      "Deposit requested",
      "Deposit paid",
      "Work started",
      "Work ready",
      "Balance requested",
      "Completed",
    ]);
  });

  it("never releases the delivery link before completed, whatever the status", async () => {
    await saveDeliveryLink(store, SELLER, job.id, "https://files.example.com/dress");
    for (const status of ["created", "in_progress", "ready", "balance_pending"] as const) {
      store.jobs.get(job.id)!.status = status;
      const state = await loadClientJobState(deps, job.id);
      expect(state?.deliveryUrl, status).toBeNull();
    }
  });

  it("refuses to skip steps", async () => {
    await expect(performSellerAction(store, SELLER, job.id, "mark-ready")).rejects.toMatchObject({
      code: "not-allowed",
    });
    await expect(performSellerAction(store, SELLER, job.id, "start-work")).rejects.toMatchObject({
      code: "not-allowed",
    });
    await expect(requestBalance(deps, SELLER, job.id)).rejects.toMatchObject({
      code: "not-allowed",
    });
    expect(await statusOf(job)).toBe("created");
  });

  it("does not let the seller mark a job done while a balance is owed", async () => {
    store.jobs.get(job.id)!.status = "ready";
    await expect(performSellerAction(store, SELLER, job.id, "mark-done")).rejects.toMatchObject({
      code: "not-allowed",
    });
  });

  it("asking for the balance twice gives the same invoice", async () => {
    store.jobs.get(job.id)!.status = "ready";
    await requestBalance(deps, SELLER, job.id);
    await requestBalance(deps, SELLER, job.id);
    expect(store.invoices.size).toBe(1);
    expect(await statusOf(job)).toBe("balance_pending");
  });

  it("cancels, after which no invoice is made and the delivery link stays hidden", async () => {
    await performSellerAction(store, SELLER, job.id, "cancel");
    const state = await loadClientJobState(deps, job.id);
    expect(state).toMatchObject({
      status: "cancelled",
      payment: { kind: "none" },
      deliveryUrl: null,
    });
    expect(store.invoices.size).toBe(0);
    await expect(performSellerAction(store, SELLER, job.id, "start-work")).rejects.toBeInstanceOf(
      SellerActionError,
    );
  });
});

describe("a job paid in full upfront", () => {
  it("goes from ready straight to completed with no balance invoice", async () => {
    const job = await createJob(store, SELLER, { ...base, depositMinor: base.priceMinor });
    await clientPays(job);
    await performSellerAction(store, SELLER, job.id, "start-work");
    await performSellerAction(store, SELLER, job.id, "mark-ready");

    await expect(requestBalance(deps, SELLER, job.id)).rejects.toMatchObject({
      code: "not-allowed",
    });
    await performSellerAction(store, SELLER, job.id, "mark-done");

    expect(await statusOf(job)).toBe("completed");
    expect([...store.invoices.values()].every((invoice) => invoice.purpose === "deposit")).toBe(
      true,
    );
  });
});

describe("ownership", () => {
  it("treats another seller's job as not found for every action", async () => {
    const job = await createJob(store, SELLER, base);
    await expect(
      performSellerAction(store, "someone-else", job.id, "cancel"),
    ).rejects.toMatchObject({
      code: "not-found",
    });
    await expect(requestBalance(deps, "someone-else", job.id)).rejects.toMatchObject({
      code: "not-found",
    });
    await expect(
      saveDeliveryLink(store, "someone-else", job.id, "https://example.com/x"),
    ).rejects.toMatchObject({ code: "not-found" });
    expect(await statusOf(job)).toBe("created");
  });
});

describe("saveDeliveryLink", () => {
  it("refuses a link that is not https", async () => {
    const job = await createJob(store, SELLER, base);
    await expect(
      saveDeliveryLink(store, SELLER, job.id, "javascript:alert(1)"),
    ).rejects.toMatchObject({ code: "invalid" });
    expect((await store.findJobById(job.id))?.deliveryUrl).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { FakeWalletProvider } from "@/lib/wallet/fake-wallet-provider";
import { refreshPayment } from "./client-payment";
import type { CreateInvoiceDeps } from "./create-invoice";
import { createJob } from "./create-job";
import type { JobRecord } from "./job-store";
import { MemoryJobStore } from "./memory-job-store";

const RATE = "100000000.00000000";

let store: MemoryJobStore;
let wallet: FakeWalletProvider;
let clock: Date;
let deps: CreateInvoiceDeps;
let job: JobRecord;

beforeEach(async () => {
  store = new MemoryJobStore();
  wallet = new FakeWalletProvider();
  clock = new Date("2026-11-08T10:00:00Z");
  deps = { store, wallet, getRate: async () => ({ rate: RATE, source: "test" }), now: () => clock };
  job = await createJob(store, "seller-1", {
    clientName: "Ada",
    title: "Wedding dress",
    details: "",
    deadline: null,
    currency: "NGN",
    priceMinor: 10_000_00n,
    depositMinor: 4_000_00n,
  });
});

function openOf(state: Awaited<ReturnType<typeof refreshPayment>>) {
  if (state.kind !== "open") throw new Error(`expected open, got ${state.kind}`);
  return state;
}

describe("refreshPayment", () => {
  it("makes the first invoice and moves the job to deposit_pending", async () => {
    const state = openOf(await refreshPayment(deps, job.id, "deposit"));
    expect(state.amountSats).toBe("4000");
    expect(state.fiatMinor).toBe("400000");
    expect((await store.findJobById(job.id))?.status).toBe("deposit_pending");
  });

  it("returns the same invoice when polled again", async () => {
    const first = openOf(await refreshPayment(deps, job.id, "deposit"));
    const second = openOf(await refreshPayment(deps, job.id, "deposit"));
    expect(second.bolt11).toBe(first.bolt11);
    expect(store.invoices.size).toBe(1);
  });

  it("marks the deposit paid once, even when polled many times after payment", async () => {
    const first = openOf(await refreshPayment(deps, job.id, "deposit"));
    const [invoice] = [...store.invoices.values()];
    wallet.simulatePayment(invoice!.paymentHash);

    expect(first.kind).toBe("open");
    await Promise.all([
      refreshPayment(deps, job.id, "deposit"),
      refreshPayment(deps, job.id, "deposit"),
    ]);
    expect(await refreshPayment(deps, job.id, "deposit")).toEqual({ kind: "paid" });

    expect((await store.findJobById(job.id))?.status).toBe("deposit_paid");
    const paidMoves = store.events.filter((event) => event.to === "deposit_paid");
    expect(paidMoves).toHaveLength(1);
  });

  it("makes a new invoice at a new rate after the old one expires", async () => {
    const first = openOf(await refreshPayment(deps, job.id, "deposit"));
    clock = new Date(clock.getTime() + 16 * 60_000);
    deps = { ...deps, getRate: async () => ({ rate: "50000000.00000000", source: "test" }) };

    const second = openOf(await refreshPayment(deps, job.id, "deposit"));
    expect(second.bolt11).not.toBe(first.bolt11);
    expect(second.amountSats).toBe("8000");
    const statuses = [...store.invoices.values()].map((invoice) => invoice.status);
    expect(statuses.sort()).toEqual(["expired", "pending"]);
  });

  it("still records a payment that arrives just after the clock ran out", async () => {
    openOf(await refreshPayment(deps, job.id, "deposit"));
    const [invoice] = [...store.invoices.values()];
    wallet.simulatePayment(invoice!.paymentHash);
    clock = new Date(clock.getTime() + 16 * 60_000);

    expect(await refreshPayment(deps, job.id, "deposit")).toEqual({ kind: "paid" });
    expect(store.invoices.size).toBe(1);
  });

  it("reports a cancelled job without making an invoice", async () => {
    await store.moveJob(job.id, "created", "cancelled", "seller");
    expect(await refreshPayment(deps, job.id, "deposit")).toEqual({ kind: "cancelled" });
    expect(store.invoices.size).toBe(0);
  });
});

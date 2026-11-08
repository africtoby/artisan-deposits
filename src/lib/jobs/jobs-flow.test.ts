import { beforeEach, describe, expect, it } from "vitest";
import { FakeWalletProvider } from "@/lib/wallet/fake-wallet-provider";
import type { WalletInvoice, WalletProvider } from "@/lib/wallet/wallet-provider";
import { createInvoice, InvoiceError, type CreateInvoiceDeps } from "./create-invoice";
import { createJob } from "./create-job";
import type { JobInput } from "./job-input";
import type { JobRecord } from "./job-store";
import { markInvoicePaid } from "./mark-invoice-paid";
import { MemoryJobStore } from "./memory-job-store";
import { isWellFormedToken } from "./public-token";

// 1 NGN is exactly 1 sat at this rate, which keeps the arithmetic easy to read.
const RATE = "100000000.00000000";

const input: JobInput = {
  clientName: "Ada",
  title: "Wedding dress",
  details: "",
  deadline: null,
  currency: "NGN",
  priceMinor: 10_000_00n, // ₦10,000
  depositMinor: 4_000_00n, // ₦4,000
};

let store: MemoryJobStore;
let wallet: FakeWalletProvider;
let clock: Date;
let deps: CreateInvoiceDeps;
let job: JobRecord;

beforeEach(async () => {
  store = new MemoryJobStore();
  wallet = new FakeWalletProvider();
  clock = new Date("2026-11-08T10:00:00Z");
  deps = {
    store,
    wallet,
    getRate: async () => ({ rate: RATE, source: "test" }),
    now: () => clock,
  };
  job = await createJob(store, "seller-1", input);
});

describe("createJob", () => {
  it("starts as created with a 43 character token and a timeline entry", () => {
    expect(job.status).toBe("created");
    expect(isWellFormedToken(job.publicToken)).toBe(true);
    expect(store.events).toEqual([
      {
        jobId: job.id,
        at: expect.any(Date),
        from: null,
        to: "created",
        actor: "seller",
        note: null,
      },
    ]);
  });
});

describe("createInvoice", () => {
  it("prices the deposit on the server, locks the rate and expires in 15 minutes", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    expect(invoice.fiatMinor).toBe(400_000n);
    expect(invoice.amountSats).toBe(4000n);
    expect(invoice.rateUsed).toBe(RATE);
    expect(invoice.currency).toBe("NGN");
    expect(invoice.expiresAt.getTime()).toBe(clock.getTime() + 15 * 60 * 1000);
    expect(invoice.status).toBe("pending");
  });

  it("moves a new job to deposit_pending once", async () => {
    await createInvoice(deps, job.id, "deposit");
    expect((await store.findJobById(job.id))?.status).toBe("deposit_pending");
    expect(store.events.filter((e) => e.to === "deposit_pending")).toHaveLength(1);
  });

  it("returns the same open invoice instead of making another", async () => {
    const first = await createInvoice(deps, job.id, "deposit");
    clock = new Date(clock.getTime() + 60_000);
    const second = await createInvoice(deps, job.id, "deposit");
    expect(second.paymentHash).toBe(first.paymentHash);
    expect(store.invoices.size).toBe(1);
  });

  it("makes a new invoice at a new rate after expiry and marks the old one expired", async () => {
    const first = await createInvoice(deps, job.id, "deposit");
    clock = new Date(first.expiresAt.getTime() + 1000);
    deps.getRate = async () => ({ rate: "50000000.00000000", source: "test" });
    const second = await createInvoice(deps, job.id, "deposit");
    expect(second.paymentHash).not.toBe(first.paymentHash);
    expect(second.amountSats).toBe(8000n);
    expect(second.rateUsed).toBe("50000000.00000000");
    expect((await store.findInvoiceByPaymentHash(first.paymentHash))?.status).toBe("expired");
  });

  it("refuses a balance invoice before the job is ready", async () => {
    await expect(createInvoice(deps, job.id, "balance")).rejects.toMatchObject({
      code: "wrong-status",
    });
  });

  it("refuses a balance invoice when nothing is owed", async () => {
    const paidUpfront = await createJob(store, "seller-1", {
      ...input,
      depositMinor: input.priceMinor,
    });
    store.jobs.get(paidUpfront.id)!.status = "ready";
    await expect(createInvoice(deps, paidUpfront.id, "balance")).rejects.toMatchObject({
      code: "nothing-to-pay",
    });
  });

  it("prices the balance as price minus deposit", async () => {
    store.jobs.get(job.id)!.status = "ready";
    const invoice = await createInvoice(deps, job.id, "balance");
    expect(invoice.fiatMinor).toBe(600_000n);
    expect(invoice.amountSats).toBe(6000n);
  });

  it("rejects an unknown job", async () => {
    await expect(createInvoice(deps, "missing", "deposit")).rejects.toBeInstanceOf(InvoiceError);
  });

  it("fails and stores nothing when the rate is unavailable", async () => {
    deps.getRate = async () => Promise.reject(new Error("no rate"));
    await expect(createInvoice(deps, job.id, "deposit")).rejects.toThrow("no rate");
    expect(store.invoices.size).toBe(0);
    expect((await store.findJobById(job.id))?.status).toBe("created");
  });

  it("rejects a wallet invoice for a different amount", async () => {
    const lying: WalletProvider = Object.assign(Object.create(wallet) as WalletProvider, {
      makeInvoice: async (): Promise<WalletInvoice> => ({
        bolt11: "lnbc1",
        paymentHash: "ab".repeat(32),
        amountSats: 1n,
        expiresAt: new Date(clock.getTime() + 900_000),
      }),
    });
    await expect(
      createInvoice({ ...deps, wallet: lying }, job.id, "deposit"),
    ).rejects.toMatchObject({
      code: "wallet-mismatch",
    });
    expect(store.invoices.size).toBe(0);
  });
});

describe("markInvoicePaid", () => {
  it("moves the job to deposit_paid and records the payment", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    const result = await markInvoicePaid(
      store,
      invoice.paymentHash,
      new Date("2026-11-08T10:05:00Z"),
    );
    expect(result.changed).toBe(true);
    expect((await store.findJobById(job.id))?.status).toBe("deposit_paid");
    const saved = await store.findInvoiceByPaymentHash(invoice.paymentHash);
    expect(saved?.status).toBe("paid");
    expect(saved?.paidAt?.toISOString()).toBe("2026-11-08T10:05:00.000Z");
  });

  it("does nothing the second time", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    await markInvoicePaid(store, invoice.paymentHash);
    const again = await markInvoicePaid(store, invoice.paymentHash);
    expect(again).toEqual({ changed: false });
    expect(store.events.filter((e) => e.to === "deposit_paid")).toHaveLength(1);
  });

  it("makes exactly one change when checked many times at once", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    const results = await Promise.all(
      Array.from({ length: 10 }, () => markInvoicePaid(store, invoice.paymentHash)),
    );
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(store.events.filter((e) => e.to === "deposit_paid")).toHaveLength(1);
  });

  it("ignores a payment hash that is not ours", async () => {
    expect(await markInvoicePaid(store, "ff".repeat(32))).toEqual({ changed: false });
  });

  it("accepts a payment that arrives after the invoice expired", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    clock = new Date(invoice.expiresAt.getTime() + 1000);
    await createInvoice(deps, job.id, "deposit"); // sweeps the old one to expired
    expect((await store.findInvoiceByPaymentHash(invoice.paymentHash))?.status).toBe("expired");
    const result = await markInvoicePaid(store, invoice.paymentHash);
    expect(result.changed).toBe(true);
    expect((await store.findJobById(job.id))?.status).toBe("deposit_paid");
  });

  it("records the payment but does not move a cancelled job", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    store.jobs.get(job.id)!.status = "cancelled";
    const result = await markInvoicePaid(store, invoice.paymentHash);
    expect(result).toMatchObject({ changed: true, jobMoved: false });
    expect((await store.findJobById(job.id))?.status).toBe("cancelled");
  });

  it("completes the job when the balance is paid, once", async () => {
    store.jobs.get(job.id)!.status = "ready";
    const invoice = await createInvoice(deps, job.id, "balance");
    store.jobs.get(job.id)!.status = "balance_pending";
    await markInvoicePaid(store, invoice.paymentHash);
    await markInvoicePaid(store, invoice.paymentHash);
    expect((await store.findJobById(job.id))?.status).toBe("completed");
    expect(store.events.filter((e) => e.to === "completed")).toHaveLength(1);
  });

  it("undoes everything if a step fails midway", async () => {
    const invoice = await createInvoice(deps, job.id, "deposit");
    const original = store.moveJob.bind(store);
    store.moveJob = async () => {
      throw new Error("database went away");
    };
    await expect(markInvoicePaid(store, invoice.paymentHash)).rejects.toThrow("database went away");
    store.moveJob = original;
    expect((await store.findInvoiceByPaymentHash(invoice.paymentHash))?.status).toBe("pending");
  });
});

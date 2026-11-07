import { describe, expect, it } from "vitest";
import { tapeProgress, type JobStatusName } from "./tape-stages";

describe("tapeProgress with a balance to pay", () => {
  const cases: [JobStatusName, number, string][] = [
    ["created", 1, "Deposit"],
    ["deposit_pending", 1, "Deposit"],
    ["deposit_paid", 2, "In progress"],
    ["in_progress", 2, "In progress"],
    ["ready", 3, "Ready"],
    ["balance_pending", 4, "Balance"],
    ["completed", 5, "Done"],
  ];

  it.each(cases)("%s sits on stage %i (%s)", (status, number, label) => {
    const result = tapeProgress(status, false);
    expect(result.kind).toBe("active");
    if (result.kind === "active") {
      expect(result.stages).toHaveLength(5);
      expect(result.current.number).toBe(number);
      expect(result.current.label).toBe(label);
      expect(result.text).toBe(`Step ${number} of 5: ${label}`);
    }
  });
});

describe("tapeProgress when the balance is zero", () => {
  it("skips the balance stage and renumbers the rest", () => {
    const result = tapeProgress("ready", true);
    expect(result.stages.map((s) => s.label)).toEqual(["Deposit", "In progress", "Ready", "Done"]);
    expect(result.stages.map((s) => s.number)).toEqual([1, 2, 3, 4]);
  });

  it("puts a completed job on the last numbered stage", () => {
    const result = tapeProgress("completed", true);
    expect(result.kind === "active" && result.text).toBe("Step 4 of 4: Done");
  });

  it("rejects balance_pending, which cannot happen without a balance", () => {
    expect(() => tapeProgress("balance_pending", true)).toThrow();
  });
});

describe("tapeProgress for a cancelled job", () => {
  it("has no pin and says so in text", () => {
    const result = tapeProgress("cancelled", false);
    expect(result.kind).toBe("cancelled");
    expect(result.text).toBe("Cancelled");
    expect(result.stages).toHaveLength(5);
  });
});

describe("every status is mapped", () => {
  const all: JobStatusName[] = [
    "created",
    "deposit_pending",
    "deposit_paid",
    "in_progress",
    "ready",
    "balance_pending",
    "completed",
    "cancelled",
  ];

  it.each(all)("%s does not throw", (status) => {
    expect(() => tapeProgress(status, false)).not.toThrow();
  });
});

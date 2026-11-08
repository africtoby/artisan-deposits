import { describe, expect, it } from "vitest";
import type { JobStatus } from "@/generated/prisma/enums";
import { assertMove, canMove, nextStatuses, StatusError } from "./status-machine";

const ALL: JobStatus[] = [
  "created",
  "deposit_pending",
  "deposit_paid",
  "in_progress",
  "ready",
  "balance_pending",
  "completed",
  "cancelled",
];

// Every legal move, written out. Anything not in these lists must be refused.
const LEGAL_WITH_BALANCE: [JobStatus, JobStatus][] = [
  ["created", "deposit_pending"],
  ["deposit_pending", "deposit_paid"],
  ["deposit_paid", "in_progress"],
  ["in_progress", "ready"],
  ["ready", "balance_pending"],
  ["balance_pending", "completed"],
];

const LEGAL_WITHOUT_BALANCE: [JobStatus, JobStatus][] = [
  ["created", "deposit_pending"],
  ["deposit_pending", "deposit_paid"],
  ["deposit_paid", "in_progress"],
  ["in_progress", "ready"],
  ["ready", "completed"],
];

const CANCELLABLE: JobStatus[] = [
  "created",
  "deposit_pending",
  "deposit_paid",
  "in_progress",
  "ready",
  "balance_pending",
];

function legalSet(balanceIsZero: boolean): Set<string> {
  const forward = balanceIsZero ? LEGAL_WITHOUT_BALANCE : LEGAL_WITH_BALANCE;
  const pairs = forward.map(([from, to]) => `${from}>${to}`);
  for (const from of CANCELLABLE) pairs.push(`${from}>cancelled`);
  return new Set(pairs);
}

describe.each([
  { balanceIsZero: false, label: "when a balance is owed" },
  { balanceIsZero: true, label: "when paid in full upfront" },
])("status machine $label", ({ balanceIsZero }) => {
  const legal = legalSet(balanceIsZero);

  it("allows every legal move and refuses every other pair", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const expected = legal.has(`${from}>${to}`);
        expect(canMove(from, to, balanceIsZero), `${from} to ${to}`).toBe(expected);
      }
    }
  });

  it("throws a StatusError for an illegal jump", () => {
    expect(() => assertMove("created", "completed", balanceIsZero)).toThrow(StatusError);
    expect(() => assertMove("in_progress", "created", balanceIsZero)).toThrow(StatusError);
  });

  it("does not throw for a legal move", () => {
    expect(() => assertMove("created", "deposit_pending", balanceIsZero)).not.toThrow();
  });

  it("lets nothing leave completed or cancelled", () => {
    expect(nextStatuses("completed", balanceIsZero)).toEqual([]);
    expect(nextStatuses("cancelled", balanceIsZero)).toEqual([]);
  });
});

describe("the zero balance shortcut", () => {
  it("skips balance_pending only when nothing is owed", () => {
    expect(canMove("ready", "completed", true)).toBe(true);
    expect(canMove("ready", "balance_pending", true)).toBe(false);
    expect(canMove("ready", "completed", false)).toBe(false);
    expect(canMove("ready", "balance_pending", false)).toBe(true);
  });
});

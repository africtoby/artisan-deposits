import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimitsForTests } from "./rate-limit";

beforeEach(resetRateLimitsForTests);

describe("rateLimit", () => {
  it("allows up to the limit, then blocks and says how long to wait", () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(rateLimit("a", 3, 60_000, 1_000).allowed).toBe(true);
    }
    const blocked = rateLimit("a", 3, 60_000, 31_000);
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it("starts a fresh window once the old one ends", () => {
    for (let attempt = 0; attempt < 3; attempt++) rateLimit("a", 3, 60_000, 0);
    expect(rateLimit("a", 3, 60_000, 59_999).allowed).toBe(false);
    expect(rateLimit("a", 3, 60_000, 60_000).allowed).toBe(true);
  });

  it("counts each key separately", () => {
    rateLimit("a", 1, 60_000, 0);
    expect(rateLimit("a", 1, 60_000, 1).allowed).toBe(false);
    expect(rateLimit("b", 1, 60_000, 1).allowed).toBe(true);
  });
});

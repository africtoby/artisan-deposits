import { describe, expect, it } from "vitest";
import { parseJobInput } from "./job-input";

const valid = {
  clientName: "Ada",
  title: "Wedding dress",
  details: "Ankara, size 12",
  deadline: "2026-12-01",
  currency: "NGN",
  price: "40000",
  deposit: "20000",
};

describe("parseJobInput", () => {
  it("accepts a valid job and converts money to minor units", () => {
    const result = parseJobInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.priceMinor).toBe(4_000_000n);
      expect(result.value.depositMinor).toBe(2_000_000n);
      expect(result.value.deadline).toBe("2026-12-01");
    }
  });

  it("allows a deposit equal to the price (paid in full upfront)", () => {
    const result = parseJobInput({ ...valid, deposit: "40000" });
    expect(result.ok).toBe(true);
  });

  it("allows a blank deadline", () => {
    const result = parseJobInput({ ...valid, deadline: "" });
    expect(result.ok && result.value.deadline).toBe(null);
  });

  it("rejects a deposit above the price or at zero", () => {
    const over = parseJobInput({ ...valid, deposit: "40001" });
    expect(!over.ok && over.errors.deposit).toBeTruthy();
    const zero = parseJobInput({ ...valid, deposit: "0" });
    expect(!zero.ok && zero.errors.deposit).toBeTruthy();
  });

  it("rejects a zero price and too many decimals", () => {
    const zero = parseJobInput({ ...valid, price: "0" });
    expect(!zero.ok && zero.errors.price).toBeTruthy();
    const decimals = parseJobInput({ ...valid, currency: "XOF", price: "100.5", deposit: "50" });
    expect(!decimals.ok && decimals.errors.price).toBeTruthy();
  });

  it("rejects an unknown currency", () => {
    const result = parseJobInput({ ...valid, currency: "BTC" });
    expect(!result.ok && result.errors.currency).toBeTruthy();
  });

  it("reports missing names and a bad date", () => {
    const result = parseJobInput({ ...valid, clientName: "  ", title: "", deadline: "soon" });
    expect(!result.ok && result.errors.clientName).toBeTruthy();
    expect(!result.ok && result.errors.title).toBeTruthy();
    expect(!result.ok && result.errors.deadline).toBeTruthy();
  });
});

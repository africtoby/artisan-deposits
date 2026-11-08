import { describe, expect, it } from "vitest";
import { CASH_OUT_PARTNERS } from "./cash-out-partners";

describe("CASH_OUT_PARTNERS", () => {
  it("has at least one partner", () => {
    expect(CASH_OUT_PARTNERS.length).toBeGreaterThan(0);
  });

  it("only links to https addresses", () => {
    for (const partner of CASH_OUT_PARTNERS) {
      expect(new URL(partner.url).protocol).toBe("https:");
    }
  });

  it("gives every partner a name and a one line description", () => {
    for (const partner of CASH_OUT_PARTNERS) {
      expect(partner.name.length).toBeGreaterThan(0);
      expect(partner.description.length).toBeGreaterThan(0);
    }
  });
});

import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("keeps normal in-app paths", () => {
    expect(safeNextPath("/wallet")).toBe("/wallet");
    expect(safeNextPath("/jobs/123?tab=money")).toBe("/jobs/123?tab=money");
  });

  it("falls back when nothing is given", () => {
    expect(safeNextPath(null)).toBe("/connect-wallet");
    expect(safeNextPath("")).toBe("/connect-wallet");
    expect(safeNextPath(undefined, "/jobs")).toBe("/jobs");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "wallet",
    "/ok\nSet-Cookie: x=1",
  ])("rejects %j", (value) => {
    expect(safeNextPath(value)).toBe("/connect-wallet");
  });
});

import { describe, expect, it } from "vitest";
import { generatePublicToken, isWellFormedToken } from "./public-token";

describe("public token", () => {
  it("is 43 url-safe characters and passes its own check", () => {
    const token = generatePublicToken();
    expect(token).toHaveLength(43);
    expect(isWellFormedToken(token)).toBe(true);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 200 }, generatePublicToken));
    expect(tokens.size).toBe(200);
  });

  it("rejects wrong lengths and characters", () => {
    expect(isWellFormedToken("")).toBe(false);
    expect(isWellFormedToken("a".repeat(42))).toBe(false);
    expect(isWellFormedToken("a".repeat(44))).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)}/`)).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)}'`)).toBe(false);
  });
});

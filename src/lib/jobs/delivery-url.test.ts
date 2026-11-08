import { describe, expect, it } from "vitest";
import { parseDeliveryUrl } from "./delivery-url";

describe("parseDeliveryUrl", () => {
  it("accepts an https link and trims spaces", () => {
    expect(parseDeliveryUrl("  https://drive.example.com/folder/abc  ")).toEqual({
      ok: true,
      url: "https://drive.example.com/folder/abc",
    });
  });

  it.each([
    "http://example.com/files",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/file",
    "//example.com/file",
    "example.com/file",
    "https://user:pass@example.com/file",
    "https://",
    "",
    "   ",
  ])("refuses %j", (raw) => {
    expect(parseDeliveryUrl(raw).ok).toBe(false);
  });

  it("refuses a link that is not text", () => {
    expect(parseDeliveryUrl(null).ok).toBe(false);
    expect(parseDeliveryUrl(42).ok).toBe(false);
  });

  it("refuses a very long link", () => {
    expect(parseDeliveryUrl(`https://example.com/${"a".repeat(2000)}`).ok).toBe(false);
  });
});

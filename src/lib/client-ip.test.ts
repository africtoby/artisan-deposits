import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./client-ip";

describe("clientIpFrom", () => {
  it("prefers the Vercel header over one the visitor could send", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "1.1.1.1",
      "x-forwarded-for": "6.6.6.6, 1.1.1.1",
    });
    expect(clientIpFrom(headers)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIpFrom(new Headers({ "x-forwarded-for": " 3.3.3.3 , 4.4.4.4" }))).toBe("3.3.3.3");
  });

  it("returns unknown when there is no address", () => {
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});

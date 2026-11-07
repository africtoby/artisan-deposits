import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  APP_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};

describe("parseServerEnv", () => {
  it("accepts a complete environment and defaults the AI flag to off", () => {
    expect(parseServerEnv(valid).AI_INTAKE_ENABLED).toBe(false);
  });

  it("treats blank optional values as not set", () => {
    const env = parseServerEnv({
      ...valid,
      DIRECT_URL: "",
      COINGECKO_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      AI_INTAKE_ENABLED: "",
    });
    expect(env.DIRECT_URL).toBeUndefined();
    expect(env.COINGECKO_API_KEY).toBeUndefined();
    expect(env.AI_INTAKE_ENABLED).toBe(false);
  });

  it("still requires the required ones when blank", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  it("reads AI_INTAKE_ENABLED=true", () => {
    expect(parseServerEnv({ ...valid, AI_INTAKE_ENABLED: "true" }).AI_INTAKE_ENABLED).toBe(true);
  });

  it("rejects a missing variable and names it", () => {
    const rest: Record<string, string | undefined> = { ...valid };
    delete rest.DATABASE_URL;
    expect(() => parseServerEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("rejects an encryption key of the wrong length without printing it", () => {
    const bad = randomBytes(16).toString("base64");
    let message = "";
    try {
      parseServerEnv({ ...valid, APP_ENCRYPTION_KEY: bad });
    } catch (error) {
      message = String(error);
    }
    expect(message).toMatch(/32 random bytes/);
    expect(message).not.toContain(bad);
  });
});

import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, keyFromBase64 } from "./secret-box";

const key = randomBytes(32);
const link = "nostr+walletconnect://abc?relay=wss%3A%2F%2Frelay.example&secret=topsecret";

describe("secret-box", () => {
  it("round trips a secret", () => {
    expect(decryptSecret(encryptSecret(link, key), key)).toBe(link);
  });

  it("does not leak the plaintext into the stored text", () => {
    expect(encryptSecret(link, key)).not.toContain("topsecret");
  });

  it("uses a fresh nonce each time", () => {
    expect(encryptSecret(link, key)).not.toBe(encryptSecret(link, key));
  });

  it("fails with the wrong key", () => {
    const stored = encryptSecret(link, key);
    expect(() => decryptSecret(stored, randomBytes(32))).toThrow("Could not decrypt secret.");
  });

  it("fails when the data was tampered with", () => {
    const stored = encryptSecret(link, key);
    const [version, body] = stored.split(".");
    const bytes = Buffer.from(body, "base64url");
    bytes[bytes.length - 1] ^= 1;
    const tampered = `${version}.${bytes.toString("base64url")}`;
    expect(() => decryptSecret(tampered, key)).toThrow("Could not decrypt secret.");
  });

  it("fails when the context differs (ciphertext moved to another seller)", () => {
    const stored = encryptSecret(link, key, "seller-1");
    expect(() => decryptSecret(stored, key, "seller-2")).toThrow("Could not decrypt secret.");
    expect(decryptSecret(stored, key, "seller-1")).toBe(link);
  });

  it("rejects garbage and wrong versions without echoing the input", () => {
    expect(() => decryptSecret("nonsense", key)).toThrow("Could not decrypt secret.");
    expect(() => decryptSecret("v9.AAAA", key)).toThrow("Could not decrypt secret.");
    expect(() => decryptSecret("v1.AAAA", key)).toThrow("Could not decrypt secret.");
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() => keyFromBase64(randomBytes(16).toString("base64"))).toThrow();
    expect(keyFromBase64(key.toString("base64"))).toHaveLength(32);
  });
});

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Stored format: "v1." + base64url(iv | auth tag | ciphertext). The version prefix lets us
// change the scheme later without guessing which rows use which.
const VERSION = "v1";
const IV_BYTES = 12; // the size GCM is designed for
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export function keyFromBase64(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("Encryption key must be 32 bytes encoded as base64.");
  }
  return key;
}

// `context` (for example the seller's id) is bound into the tag, so a ciphertext copied onto
// another seller's row fails to decrypt instead of quietly working.
export function encryptSecret(plaintext: string, key: Buffer, context = ""): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  return `${VERSION}.${payload.toString("base64url")}`;
}

// Errors are deliberately vague: never include the input, which may be a wallet link.
export function decryptSecret(stored: string, key: Buffer, context = ""): string {
  const [version, body] = stored.split(".");
  if (version !== VERSION || !body) {
    throw new Error("Could not decrypt secret.");
  }
  const payload = Buffer.from(body, "base64url");
  if (payload.length < IV_BYTES + TAG_BYTES) {
    throw new Error("Could not decrypt secret.");
  }
  const iv = payload.subarray(0, IV_BYTES);
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = payload.subarray(IV_BYTES + TAG_BYTES);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Could not decrypt secret.");
  }
}

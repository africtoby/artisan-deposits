import { randomBytes } from "node:crypto";

// 32 random bytes is 43 base64url characters. The token is the only thing protecting a client page.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generatePublicToken(): string {
  return randomBytes(32).toString("base64url");
}

// Checked before any database lookup, so junk in the URL never reaches a query.
export function isWellFormedToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

import { z } from "zod";

// The seller types this and the client opens it, so it is treated as untrusted. https only blocks
// javascript:, data: and plain http links; credentials in the address are refused so a link cannot
// hide where it really goes.
const deliveryUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter the link to the finished files.")
  .max(2000, "That link is too long.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.username === "" && url.password === "";
    } catch {
      return false;
    }
  }, "Enter a link that starts with https://");

export type DeliveryUrlResult = { ok: true; url: string } | { ok: false; message: string };

export function parseDeliveryUrl(raw: unknown): DeliveryUrlResult {
  const parsed = deliveryUrlSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid link." };
  }
  // Normalised by the URL parser, so what is stored is what the browser will open.
  return { ok: true, url: new URL(parsed.data).href };
}

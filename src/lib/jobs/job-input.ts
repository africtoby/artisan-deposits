import { z } from "zod";
import { parseMajorToMinor } from "@/lib/money/convert";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/money/currencies";

export type JobInput = {
  clientName: string;
  title: string;
  details: string;
  deadline: string | null;
  currency: CurrencyCode;
  priceMinor: bigint;
  depositMinor: bigint;
};

export type JobInputField =
  "clientName" | "title" | "details" | "deadline" | "currency" | "price" | "deposit";

export type JobInputResult =
  { ok: true; value: JobInput } | { ok: false; errors: Partial<Record<JobInputField, string>> };

const textSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(1, "Enter the client's name.")
    .max(100, "Use 100 characters or fewer."),
  title: z
    .string()
    .trim()
    .min(1, "Enter what the job is.")
    .max(120, "Use 120 characters or fewer."),
  details: z.string().trim().max(2000, "Use 2,000 characters or fewer."),
  deadline: z.union([z.literal(""), z.iso.date("Enter a valid date.")]),
  currency: z.enum(CURRENCY_CODES, "Choose a currency from the list."),
  price: z.string(),
  deposit: z.string(),
});

// Takes the raw form values and works out the money itself. The browser never sends minor units,
// so there is no way to send an amount that disagrees with the currency's decimals.
export function parseJobInput(raw: Record<string, unknown>): JobInputResult {
  const text = textSchema.safeParse({
    clientName: raw.clientName ?? "",
    title: raw.title ?? "",
    details: raw.details ?? "",
    deadline: raw.deadline ?? "",
    currency: raw.currency,
    price: raw.price ?? "",
    deposit: raw.deposit ?? "",
  });

  const errors: Partial<Record<JobInputField, string>> = {};
  if (!text.success) {
    for (const issue of text.error.issues) {
      const field = issue.path[0] as JobInputField;
      errors[field] ??= issue.message;
    }
  }
  if (!text.success && (errors.currency || errors.price || errors.deposit))
    return { ok: false, errors };

  const data = text.success ? text.data : undefined;
  const currency = data?.currency;
  let priceMinor: bigint | null = null;
  let depositMinor: bigint | null = null;

  if (currency) {
    priceMinor = parseMajorToMinor(String(raw.price ?? ""), currency);
    depositMinor = parseMajorToMinor(String(raw.deposit ?? ""), currency);
    if (priceMinor === null || priceMinor <= 0n) {
      errors.price = "Enter the price as a number, with no more decimals than the currency uses.";
    }
    if (depositMinor === null || depositMinor <= 0n) {
      errors.deposit = "Enter the deposit as a number above zero.";
    } else if (priceMinor !== null && depositMinor > priceMinor) {
      errors.deposit = "The deposit cannot be more than the price.";
    }
  }

  if (!data || Object.keys(errors).length > 0 || priceMinor === null || depositMinor === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      clientName: data.clientName,
      title: data.title,
      details: data.details,
      deadline: data.deadline === "" ? null : data.deadline,
      currency: data.currency,
      priceMinor,
      depositMinor,
    },
  };
}

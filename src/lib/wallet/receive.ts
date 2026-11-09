import { z } from "zod";
import { fiatToSats, parseMajorToMinor } from "@/lib/money/convert";
import { CURRENCIES, type CurrencyCode } from "@/lib/money/currencies";
import type {
  WalletInvoice,
  WalletProvider,
  WalletInfo,
  WalletTransaction,
} from "./wallet-provider";

export const RECEIVE_EXPIRY_SECONDS = 15 * 60;
export const MAX_RECEIVE_SATS = 1_000_000n;

const amountSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .max(20, "Enter a smaller amount.");

export type ReceiveAmount =
  { ok: true; sats: bigint; fiatMinor: bigint } | { ok: false; message: string };

// The amount comes from a text box in the seller's own currency. The sats are worked out here with
// the server's rate, never taken from the browser, and a rate is passed in so this stays testable.
export function receiveAmountFromFiat(
  raw: unknown,
  currency: CurrencyCode,
  rateText: string,
): ReceiveAmount {
  const text = amountSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!text.success)
    return { ok: false, message: text.error.issues[0]?.message ?? "Enter an amount." };

  const fiatMinor = parseMajorToMinor(text.data, currency);
  if (fiatMinor === null) {
    const { decimals } = CURRENCIES[currency];
    return {
      ok: false,
      message:
        decimals === 0
          ? `Enter the amount in ${currency} as a whole number.`
          : `Enter the amount in ${currency}, like 5000 or 12.50. Use at most ${decimals} decimals.`,
    };
  }
  if (fiatMinor === 0n) return { ok: false, message: "Enter an amount above zero." };

  const sats = fiatToSats(fiatMinor, currency, rateText);
  if (sats > MAX_RECEIVE_SATS) {
    return {
      ok: false,
      message: `That is more than ${MAX_RECEIVE_SATS.toLocaleString("en-US")} sats. Enter a smaller amount.`,
    };
  }
  return { ok: true, sats, fiatMinor };
}

export async function createReceiveInvoice(
  wallet: WalletProvider,
  sats: bigint,
): Promise<WalletInvoice> {
  const invoice = await wallet.makeInvoice({
    amountSats: sats,
    description: "Wallet receive",
    expirySeconds: RECEIVE_EXPIRY_SECONDS,
  });
  // Same guard as job invoices: never show an invoice for a different amount than was asked.
  if (invoice.amountSats !== sats)
    throw new Error("The wallet made an invoice for the wrong amount.");
  return invoice;
}

export type WalletOverview = {
  info: WalletInfo;
  balanceSats: bigint;
  transactions: WalletTransaction[];
};

export async function loadWalletOverview(
  wallet: WalletProvider,
  transactionLimit = 10,
): Promise<WalletOverview> {
  const [info, balanceSats, transactions] = await Promise.all([
    wallet.getInfo(),
    wallet.getBalanceSats(),
    wallet.listTransactions(transactionLimit),
  ]);
  return { info, balanceSats, transactions };
}

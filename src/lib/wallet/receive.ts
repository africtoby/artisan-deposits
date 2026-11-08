import { z } from "zod";
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
  .regex(/^\d{1,7}$/, "Enter the amount in sats, as a whole number.")
  .transform((value) => BigInt(value))
  .refine((value) => value >= 1n, "Enter at least 1 sat.")
  .refine(
    (value) => value <= MAX_RECEIVE_SATS,
    `Enter ${MAX_RECEIVE_SATS.toLocaleString("en-US")} sats or fewer.`,
  );

export type ReceiveAmount = { ok: true; sats: bigint } | { ok: false; message: string };

// The amount comes from a text box, so it is checked here and never trusted as a number.
export function parseReceiveAmount(raw: unknown): ReceiveAmount {
  const parsed = amountSchema.safeParse(typeof raw === "string" ? raw : "");
  if (parsed.success) return { ok: true, sats: parsed.data };
  return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter an amount in sats." };
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

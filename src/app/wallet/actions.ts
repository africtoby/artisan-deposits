"use server";

import { requireUser } from "@/lib/auth/current-user";
import type { CurrencyCode } from "@/lib/money/currencies";
import { rateLimit } from "@/lib/rate-limit";
import { getRate } from "@/lib/rates/get-rate";
import { getDefaultCurrency, openWalletForSeller } from "@/lib/sellers/seller-profile";
import { createReceiveInvoice, receiveAmountFromFiat } from "@/lib/wallet/receive";

export type ReceiveState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "invoice";
      bolt11: string;
      amountSats: string;
      fiatMinor: string;
      currency: CurrencyCode;
      expiresAt: string;
    };

const TEN_MINUTES = 10 * 60_000;

export async function receiveAction(
  _previous: ReceiveState,
  formData: FormData,
): Promise<ReceiveState> {
  const user = await requireUser();

  const limit = rateLimit(`receive:${user.id}`, 20, TEN_MINUTES);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
    };
  }

  // Currency and rate both come from the server: the page only sends what the seller typed.
  const currency = await getDefaultCurrency(user.id);
  let rate: string;
  try {
    rate = (await getRate(currency)).rate;
  } catch {
    return {
      status: "error",
      message: "Couldn't get today's exchange rate. Try again in a minute.",
    };
  }
  const amount = receiveAmountFromFiat(formData.get("amount"), currency, rate);
  if (!amount.ok) return { status: "error", message: amount.message };

  const wallet = await openWalletForSeller(user.id);
  if (!wallet) return { status: "error", message: "Connect your wallet first." };
  try {
    const invoice = await createReceiveInvoice(wallet, amount.sats);
    return {
      status: "invoice",
      bolt11: invoice.bolt11,
      amountSats: invoice.amountSats.toString(),
      fiatMinor: amount.fiatMinor.toString(),
      currency,
      expiresAt: invoice.expiresAt.toISOString(),
    };
  } catch {
    // Wallet errors are shown as one calm line; the wallet link must never reach the browser.
    return {
      status: "error",
      message: "Couldn't make the invoice. Check your wallet is online and try again.",
    };
  } finally {
    wallet.close();
  }
}

"use server";

import { requireUser } from "@/lib/auth/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { openWalletForSeller } from "@/lib/sellers/seller-profile";
import { createReceiveInvoice, parseReceiveAmount } from "@/lib/wallet/receive";

export type ReceiveState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "invoice"; bolt11: string; amountSats: string; expiresAt: string };

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

  const amount = parseReceiveAmount(formData.get("amount"));
  if (!amount.ok) return { status: "error", message: amount.message };

  const wallet = await openWalletForSeller(user.id);
  if (!wallet) return { status: "error", message: "Connect your wallet first." };
  try {
    const invoice = await createReceiveInvoice(wallet, amount.sats);
    return {
      status: "invoice",
      bolt11: invoice.bolt11,
      amountSats: invoice.amountSats.toString(),
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

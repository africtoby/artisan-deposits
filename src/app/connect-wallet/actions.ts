"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { isDemoSeller, removeWalletLink, saveWalletLink } from "@/lib/sellers/seller-profile";
import { checkWalletConnection, nwcLinkSchema } from "@/lib/wallet/connect-wallet";
import { NwcWalletProvider } from "@/lib/wallet/nwc-wallet-provider";
import { isTestNetwork, WalletError } from "@/lib/wallet/wallet-provider";

export type ConnectState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "connected"; alias: string; testCoins: boolean };

const TEN_MINUTES = 10 * 60_000;

export async function connectWalletAction(
  _previous: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const user = await requireUser();
  // The demo seller already has a practice wallet; a real link must never be attached to it.
  if (await isDemoSeller(user.id)) {
    return {
      status: "error",
      message: "The demo uses practice coins. Sign in to connect a wallet.",
    };
  }

  const limit = rateLimit(`connect-wallet:${user.id}`, 5, TEN_MINUTES);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      status: "error",
      message: `Too many tries. Wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
    };
  }

  const raw = formData.get("link");
  const parsed = nwcLinkSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Paste your wallet link.",
    };
  }

  let wallet: NwcWalletProvider;
  try {
    wallet = new NwcWalletProvider(parsed.data);
  } catch (error) {
    if (error instanceof WalletError) return { status: "error", message: error.message };
    throw error;
  }

  try {
    // The link is tested against the real wallet before anything is stored.
    const check = await checkWalletConnection(wallet);
    if (!check.ok) return { status: "error", message: check.message };

    await saveWalletLink(user, parsed.data);
    revalidatePath("/connect-wallet");
    return {
      status: "connected",
      alias: check.info.alias,
      testCoins: isTestNetwork(check.info.network),
    };
  } finally {
    wallet.close();
  }
}

export async function disconnectWalletAction(): Promise<void> {
  const user = await requireUser();
  await removeWalletLink(user.id);
  revalidatePath("/connect-wallet");
}

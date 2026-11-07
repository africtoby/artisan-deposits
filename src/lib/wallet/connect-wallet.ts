import { z } from "zod";
import {
  WalletError,
  missingMethodsIn,
  spendingMethodsIn,
  type WalletInfo,
  type WalletProvider,
} from "./wallet-provider";

// Both spellings exist in the wild. Requiring relay and secret catches pasted half-links early.
export const nwcLinkSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^nostr\+?walletconnect:\/\//i.test(value), {
    message:
      "That does not look like a wallet connection link. It starts with nostr+walletconnect://",
  })
  .refine(
    (value) => {
      try {
        const query = new URL(value.replace(/^nostr\+?walletconnect:\/\//i, "https://x/"))
          .searchParams;
        return query.has("relay") && query.has("secret");
      } catch {
        return false;
      }
    },
    { message: "The link is incomplete. Copy the whole link from your wallet." },
  );

export type ConnectCheck =
  | { ok: true; info: WalletInfo }
  | { ok: false; reason: "unreachable" | "spending" | "missing-permissions"; message: string };

// Tests a link against the wallet before we store anything. Takes a provider (not a string)
// so the check can be unit tested with the fake wallet.
export async function checkWalletConnection(provider: WalletProvider): Promise<ConnectCheck> {
  let info: WalletInfo;
  try {
    info = await provider.getInfo();
  } catch (error) {
    const message =
      error instanceof WalletError && error.code === "timeout"
        ? "The wallet did not answer. Check that it is online and try again."
        : "We could not reach that wallet. Check the link and try again.";
    return { ok: false, reason: "unreachable", message };
  }

  if (spendingMethodsIn(info.methods).length > 0) {
    return {
      ok: false,
      reason: "spending",
      message:
        "This link can spend money from your wallet. Make a new link that can only receive, then paste that one.",
    };
  }

  const missing = missingMethodsIn(info.methods);
  if (missing.length > 0) {
    return {
      ok: false,
      reason: "missing-permissions",
      message: `This link is missing permissions we need: ${missing.join(", ")}. Make a new link with those turned on.`,
    };
  }

  return { ok: true, info };
}

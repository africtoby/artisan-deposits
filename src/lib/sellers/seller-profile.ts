import "server-only";
import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret, keyFromBase64 } from "@/lib/crypto/secret-box";
import { getServerEnv } from "@/lib/env";
import { NwcWalletProvider } from "@/lib/wallet/nwc-wallet-provider";
import type { WalletProvider } from "@/lib/wallet/wallet-provider";
import type { CurrentUser } from "@/lib/auth/current-user";

export type WalletStatus = { connected: false } | { connected: true; connectedAt: Date };

// The seller's own row is keyed by their sign-in id. Callers pass the id from requireUser(),
// never an id taken from the browser, so one seller can never reach another's record.
export async function ensureSellerProfile(user: CurrentUser): Promise<{ id: string }> {
  const displayName = user.email.split("@")[0] || "Seller";
  return getDb().sellerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName },
    update: {},
    select: { id: true },
  });
}

export async function getWalletStatus(userId: string): Promise<WalletStatus> {
  const profile = await getDb().sellerProfile.findUnique({
    where: { userId },
    select: { nwcSecretEncrypted: true, nwcConnectedAt: true },
  });
  if (!profile?.nwcSecretEncrypted || !profile.nwcConnectedAt) return { connected: false };
  return { connected: true, connectedAt: profile.nwcConnectedAt };
}

// The userId is mixed into the encryption, so this ciphertext only opens for this seller.
export async function saveWalletLink(user: CurrentUser, link: string): Promise<void> {
  const key = keyFromBase64(getServerEnv().APP_ENCRYPTION_KEY);
  await ensureSellerProfile(user);
  await getDb().sellerProfile.update({
    where: { userId: user.id },
    data: { nwcSecretEncrypted: encryptSecret(link, key, user.id), nwcConnectedAt: new Date() },
  });
}

export async function removeWalletLink(userId: string): Promise<void> {
  await getDb().sellerProfile.updateMany({
    where: { userId },
    data: { nwcSecretEncrypted: null, nwcConnectedAt: null },
  });
}

// Decrypts only at the moment of use, on the server. The caller must call close() when done.
export async function openWalletForSeller(userId: string): Promise<WalletProvider | null> {
  const profile = await getDb().sellerProfile.findUnique({
    where: { userId },
    select: { nwcSecretEncrypted: true },
  });
  if (!profile?.nwcSecretEncrypted) return null;
  const key = keyFromBase64(getServerEnv().APP_ENCRYPTION_KEY);
  return new NwcWalletProvider(decryptSecret(profile.nwcSecretEncrypted, key, userId));
}

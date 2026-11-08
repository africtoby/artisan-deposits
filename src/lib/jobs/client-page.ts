import "server-only";
import { getRate } from "@/lib/rates/get-rate";
import { rateLimit } from "@/lib/rate-limit";
import { openWalletForProfile } from "@/lib/sellers/seller-profile";
import { refreshDeposit, type ClientDepositState } from "./client-deposit";
import { PrismaJobStore } from "./prisma-job-store";
import { isWellFormedToken } from "./public-token";

export type ClientJobView = {
  title: string;
  clientName: string;
  currency: string;
  priceMinor: string;
  depositMinor: string;
  deposit: ClientDepositState;
};

export type ClientJobResult =
  { ok: true; view: ClientJobView } | { ok: false; reason: "not-found" | "busy" | "unavailable" };

// The token is the client's only key, so a wrong guess looks exactly like a missing page and a
// flood of guesses from one token's address is slowed down.
export async function loadClientJob(token: string): Promise<ClientJobResult> {
  if (!isWellFormedToken(token)) return { ok: false, reason: "not-found" };
  const limit = rateLimit(`client-job:${token}`, 60, 60_000);
  if (!limit.allowed) return { ok: false, reason: "busy" };

  const store = PrismaJobStore.create();
  const job = await store.findJobByToken(token);
  if (!job) return { ok: false, reason: "not-found" };

  const wallet = await openWalletForProfile(job.sellerId);
  if (!wallet) return { ok: false, reason: "unavailable" };
  try {
    const deposit = await refreshDeposit({ store, wallet, getRate }, job.id);
    return {
      ok: true,
      view: {
        title: job.title,
        clientName: job.clientName,
        currency: job.currency,
        priceMinor: job.priceMinor.toString(),
        depositMinor: job.depositMinor.toString(),
        deposit,
      },
    };
  } catch (error) {
    // Wallet offline or both rate sources down. Logged without the wallet link: WalletError
    // messages never carry it. The client sees a calm "try again", not a stack trace.
    console.error("client deposit refresh failed:", error instanceof Error ? error.name : error);
    return { ok: false, reason: "unavailable" };
  } finally {
    wallet.close();
  }
}

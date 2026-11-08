import "server-only";
import { getRate } from "@/lib/rates/get-rate";
import { rateLimit } from "@/lib/rate-limit";
import { isDemoProfile, openWalletForProfile } from "@/lib/sellers/seller-profile";
import { loadClientJobState, type ClientJobState } from "./client-job";
import { PrismaJobStore } from "./prisma-job-store";
import { isWellFormedToken } from "./public-token";

export type ClientJobView = {
  title: string;
  clientName: string;
  currency: string;
  priceMinor: string;
  depositMinor: string;
  state: ClientJobState;
  // True for judge-mode jobs, which get the "Pay with practice coins" button.
  demo: boolean;
};

export type ClientJobResult =
  { ok: true; view: ClientJobView } | { ok: false; reason: "not-found" | "busy" | "unavailable" };

const MISSES_PER_IP = 30;

// The token is the client's only key, so a wrong guess looks exactly like a missing page. Two
// limits slow guessing: one per token, and one per visitor address that counts only misses, so
// trying many different tokens from one place gets cut off while normal clients are untouched.
export async function loadClientJob(token: string, ip: string): Promise<ClientJobResult> {
  const missLimit = () => rateLimit(`client-job-miss:${ip}`, MISSES_PER_IP, 60_000);
  const missed = (): ClientJobResult =>
    missLimit().allowed ? { ok: false, reason: "not-found" } : { ok: false, reason: "busy" };

  if (!isWellFormedToken(token)) return missed();
  const limit = rateLimit(`client-job:${token}`, 60, 60_000);
  if (!limit.allowed) return { ok: false, reason: "busy" };

  const store = PrismaJobStore.create();
  const job = await store.findJobByToken(token);
  if (!job) return missed();

  const wallet = await openWalletForProfile(job.sellerId);
  if (!wallet) return { ok: false, reason: "unavailable" };
  try {
    const state = await loadClientJobState({ store, wallet, getRate }, job.id);
    if (!state) return { ok: false, reason: "not-found" };
    return {
      ok: true,
      view: {
        title: job.title,
        clientName: job.clientName,
        currency: job.currency,
        priceMinor: job.priceMinor.toString(),
        depositMinor: job.depositMinor.toString(),
        state,
        demo: await isDemoProfile(job.sellerId),
      },
    };
  } catch (error) {
    // Wallet offline or both rate sources down. Logged without the wallet link: WalletError
    // messages never carry it. The client sees a calm "try again", not a stack trace.
    console.error("client job refresh failed:", error instanceof Error ? error.name : error);
    return { ok: false, reason: "unavailable" };
  } finally {
    wallet.close();
  }
}

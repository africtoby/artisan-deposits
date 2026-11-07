import { NWCClient } from "@getalby/sdk/nwc";
import type { Nip47Transaction } from "@getalby/sdk/nwc";
import {
  WalletError,
  type InvoiceStatus,
  type MakeInvoiceInput,
  type WalletInfo,
  type WalletInvoice,
  type WalletProvider,
  type WalletTransaction,
} from "./wallet-provider";

// NIP-47 counts money in millisats; the rest of the app counts whole sats.
const MSATS_PER_SAT = 1000;
const REQUEST_TIMEOUT_MS = 15_000;

const satsFromMsats = (msats: number): bigint => BigInt(Math.floor(msats / MSATS_PER_SAT));
const dateFromSeconds = (seconds: number | undefined): Date | null =>
  seconds ? new Date(seconds * 1000) : null;

export class NwcWalletProvider implements WalletProvider {
  private readonly client: NWCClient;

  constructor(connectionString: string) {
    try {
      this.client = new NWCClient({ nostrWalletConnectUrl: connectionString });
    } catch {
      // The SDK's own message can quote the link, so it is dropped on purpose.
      throw new WalletError("That wallet link is not valid.", "invalid-link");
    }
  }

  // Every call goes through here so a dead relay becomes a clear error, not a hung request,
  // and so no SDK error text (which could contain the link) reaches a log or the browser.
  private async call<T>(request: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new WalletError("The wallet did not answer in time.", "timeout")),
        REQUEST_TIMEOUT_MS,
      );
    });
    try {
      return await Promise.race([request, timeout]);
    } catch (error) {
      if (error instanceof WalletError) throw error;
      throw new WalletError("The wallet could not complete the request.", "unreachable");
    } finally {
      clearTimeout(timer);
    }
  }

  async getInfo(): Promise<WalletInfo> {
    const info = await this.call(this.client.getInfo());
    return { alias: info.alias, network: info.network, methods: info.methods };
  }

  async getBalanceSats(): Promise<bigint> {
    const { balance } = await this.call(this.client.getBalance());
    return satsFromMsats(balance);
  }

  async makeInvoice(input: MakeInvoiceInput): Promise<WalletInvoice> {
    const created = await this.call(
      this.client.makeInvoice({
        amount: Number(input.amountSats) * MSATS_PER_SAT,
        description: input.description,
        expiry: input.expirySeconds,
      }),
    );
    return {
      bolt11: created.invoice,
      paymentHash: created.payment_hash,
      amountSats: satsFromMsats(created.amount),
      expiresAt:
        dateFromSeconds(created.expires_at) ?? new Date(Date.now() + input.expirySeconds * 1000),
    };
  }

  async lookupInvoice(paymentHash: string): Promise<InvoiceStatus> {
    const found = await this.call(this.client.lookupInvoice({ payment_hash: paymentHash }));
    const settledAt = dateFromSeconds(found.settled_at);
    if (found.state === "settled") return { state: "settled", settledAt };
    if (found.state === "failed") return { state: "failed", settledAt: null };
    const expiresAt = dateFromSeconds(found.expires_at);
    if (expiresAt && expiresAt.getTime() <= Date.now())
      return { state: "expired", settledAt: null };
    return { state: "pending", settledAt: null };
  }

  async listTransactions(limit: number): Promise<WalletTransaction[]> {
    const { transactions } = await this.call(this.client.listTransactions({ limit }));
    return transactions.map(toTransaction);
  }

  close(): void {
    this.client.close();
  }
}

function toTransaction(tx: Nip47Transaction): WalletTransaction {
  return {
    paymentHash: tx.payment_hash,
    direction: tx.type,
    state: tx.state === "settled" ? "settled" : tx.state === "failed" ? "failed" : "pending",
    amountSats: satsFromMsats(tx.amount),
    description: tx.description,
    createdAt: new Date(tx.created_at * 1000),
    settledAt: dateFromSeconds(tx.settled_at),
  };
}

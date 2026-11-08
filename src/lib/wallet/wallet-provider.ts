// The only way the rest of the app talks to a wallet. There is deliberately no pay method:
// the seller connection is receive-only (see CLAUDE.md), so the app cannot spend even by mistake.

export type WalletInfo = {
  alias: string;
  // "mainnet" means real money. Anything else is test coins and the UI must say so.
  network: string;
  // NWC method names the connection allows, for example "make_invoice".
  methods: string[];
};

export type WalletInvoice = {
  bolt11: string;
  paymentHash: string;
  amountSats: bigint;
  expiresAt: Date;
};

export type InvoiceState = "pending" | "settled" | "expired" | "failed";

export type InvoiceStatus = {
  state: InvoiceState;
  settledAt: Date | null;
};

export type WalletTransaction = {
  paymentHash: string;
  direction: "incoming" | "outgoing";
  state: "settled" | "pending" | "failed";
  amountSats: bigint;
  description: string;
  createdAt: Date;
  settledAt: Date | null;
};

export type MakeInvoiceInput = {
  amountSats: bigint;
  description: string;
  expirySeconds: number;
};

export interface WalletProvider {
  getInfo(): Promise<WalletInfo>;
  getBalanceSats(): Promise<bigint>;
  makeInvoice(input: MakeInvoiceInput): Promise<WalletInvoice>;
  lookupInvoice(paymentHash: string): Promise<InvoiceStatus>;
  listTransactions(limit: number): Promise<WalletTransaction[]>;
  close(): void;
}

// A wallet error that is safe to show or log. It never carries the connection string.
export class WalletError extends Error {
  constructor(
    message: string,
    readonly code: "unreachable" | "timeout" | "rejected" | "invalid-link",
  ) {
    super(message);
    this.name = "WalletError";
  }
}

const TEST_NETWORKS = new Set(["testnet", "signet", "regtest"]);

// An allowlist, not "anything but mainnet": a wallet that reports an odd name must never be
// treated as test coins, because that label also unlocks the spending-link exception.
export function isTestNetwork(network: string): boolean {
  return TEST_NETWORKS.has(network.toLowerCase());
}

// Methods that move money out of the wallet. We refuse links that include any of them.
const SPENDING_METHODS = new Set([
  "pay_invoice",
  "multi_pay_invoice",
  "pay_keysend",
  "multi_pay_keysend",
]);

// What the app needs from a seller link. get_info is implied: we could not read it otherwise.
export const REQUIRED_METHODS = [
  "make_invoice",
  "lookup_invoice",
  "get_balance",
  "list_transactions",
];

export function spendingMethodsIn(methods: string[]): string[] {
  return methods.filter((method) => SPENDING_METHODS.has(method));
}

export function missingMethodsIn(methods: string[]): string[] {
  return REQUIRED_METHODS.filter((method) => !methods.includes(method));
}

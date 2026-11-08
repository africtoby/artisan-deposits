import { describe, expect, it } from "vitest";
import { checkWalletConnection, nwcLinkSchema } from "./connect-wallet";
import { FakeWalletProvider } from "./fake-wallet-provider";
import { WalletError, type WalletInfo, type WalletProvider } from "./wallet-provider";

class FailingWallet extends FakeWalletProvider {
  constructor(private readonly failure: Error) {
    super();
  }
  override async getInfo(): Promise<WalletInfo> {
    throw this.failure;
  }
}

const receiveOnly = [
  "get_info",
  "get_balance",
  "make_invoice",
  "lookup_invoice",
  "list_transactions",
];

function providerWith(methods: string[], network = "regtest"): WalletProvider {
  return new FakeWalletProvider(0n, { alias: "Test", network, methods });
}

describe("FakeWalletProvider", () => {
  it("starts unpaid and settles once paid, adding to the balance", async () => {
    const wallet = new FakeWalletProvider(1000n);
    const invoice = await wallet.makeInvoice({
      amountSats: 250n,
      description: "Deposit",
      expirySeconds: 900,
    });

    expect((await wallet.lookupInvoice(invoice.paymentHash)).state).toBe("pending");
    wallet.simulatePayment(invoice.paymentHash);

    expect((await wallet.lookupInvoice(invoice.paymentHash)).state).toBe("settled");
    expect(await wallet.getBalanceSats()).toBe(1250n);
  });

  it("does not add the balance twice when the same invoice is paid twice", async () => {
    const wallet = new FakeWalletProvider();
    const invoice = await wallet.makeInvoice({
      amountSats: 100n,
      description: "x",
      expirySeconds: 900,
    });
    wallet.simulatePayment(invoice.paymentHash);
    wallet.simulatePayment(invoice.paymentHash);
    expect(await wallet.getBalanceSats()).toBe(100n);
  });

  it("reports an invoice as expired after its expiry", async () => {
    const wallet = new FakeWalletProvider();
    const invoice = await wallet.makeInvoice({
      amountSats: 100n,
      description: "x",
      expirySeconds: -1,
    });
    expect((await wallet.lookupInvoice(invoice.paymentHash)).state).toBe("expired");
  });

  it("lists newest transactions first and respects the limit", async () => {
    const wallet = new FakeWalletProvider();
    await wallet.makeInvoice({ amountSats: 1n, description: "first", expirySeconds: 900 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await wallet.makeInvoice({ amountSats: 2n, description: "second", expirySeconds: 900 });
    const list = await wallet.listTransactions(1);
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe("second");
  });

  it("rejects lookups for unknown invoices", async () => {
    await expect(new FakeWalletProvider().lookupInvoice("nope")).rejects.toThrow(WalletError);
  });
});

describe("checkWalletConnection", () => {
  it("accepts a receive-only link", async () => {
    const result = await checkWalletConnection(providerWith(receiveOnly));
    expect(result.ok).toBe(true);
  });

  it.each(["pay_invoice", "multi_pay_invoice", "pay_keysend", "multi_pay_keysend"])(
    "refuses a link that allows %s on real money",
    async (method) => {
      const result = await checkWalletConnection(providerWith([...receiveOnly, method], "mainnet"));
      expect(result).toMatchObject({ ok: false, reason: "spending" });
    },
  );

  it.each(["bitcoin", "", "Mainnet", "unknown"])(
    "refuses a spending link when the network is %j, because it is not a known test network",
    async (network) => {
      const result = await checkWalletConnection(
        providerWith([...receiveOnly, "pay_invoice"], network),
      );
      expect(result).toMatchObject({ ok: false, reason: "spending" });
    },
  );

  it.each(["testnet", "signet", "regtest"])(
    "allows a spending link on the %s test network",
    async (network) => {
      const result = await checkWalletConnection(
        providerWith([...receiveOnly, "pay_invoice"], network),
      );
      expect(result.ok).toBe(true);
    },
  );

  it("names the permissions that are missing", async () => {
    const result = await checkWalletConnection(providerWith(["get_info", "get_balance"]));
    expect(result).toMatchObject({ ok: false, reason: "missing-permissions" });
    if (!result.ok) expect(result.message).toContain("make_invoice");
  });

  it("reports an unreachable wallet without exposing the underlying error", async () => {
    const result = await checkWalletConnection(
      new FailingWallet(new Error("secret=abc123 relay refused")),
    );
    expect(result).toMatchObject({ ok: false, reason: "unreachable" });
    if (!result.ok) expect(result.message).not.toContain("abc123");
  });

  it("tells a timeout apart from other failures", async () => {
    const result = await checkWalletConnection(
      new FailingWallet(new WalletError("slow", "timeout")),
    );
    expect(result).toMatchObject({ ok: false, reason: "unreachable" });
    if (!result.ok) expect(result.message).toContain("did not answer");
  });
});

describe("nwcLinkSchema", () => {
  const good =
    "nostr+walletconnect://" +
    "ab".repeat(32) +
    "?relay=wss%3A%2F%2Frelay.example&secret=" +
    "cd".repeat(32);

  it("accepts a complete link and trims spaces", () => {
    expect(nwcLinkSchema.safeParse(`  ${good}  `).success).toBe(true);
  });

  it("accepts the nostrwalletconnect:// spelling", () => {
    expect(
      nwcLinkSchema.safeParse(good.replace("nostr+walletconnect", "nostrwalletconnect")).success,
    ).toBe(true);
  });

  it.each([
    ["an ordinary web link", "https://example.com"],
    ["a link without a secret", "nostr+walletconnect://abc?relay=wss%3A%2F%2Fr.example"],
    ["a link without a relay", "nostr+walletconnect://abc?secret=abc"],
    ["empty text", ""],
  ])("rejects %s", (_name, value) => {
    expect(nwcLinkSchema.safeParse(value).success).toBe(false);
  });
});

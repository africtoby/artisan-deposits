// Phase 1 risk test. Proves the hard part works before anything else is built:
// connect to a wallet over NWC, read the balance, make an invoice and detect payment.
//
// TEST_CLIENT_NWC_URL has spending permission. It is allowed ONLY here and in tests,
// on test coins, never in app code. The seller connection must stay receive-only.
//
// Run: npm run risk-test

import { NWCClient } from "@getalby/sdk/nwc";

const INVOICE_SATS = 100;
// NIP-47 (the NWC standard) counts amounts in millisats. The balance check below
// confirms this against the real wallet instead of trusting it.
const MSATS_PER_SAT = 1000;
const POLL_EVERY_MS = 2000;
const GIVE_UP_AFTER_MS = 120_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is missing. Add it to .env.local (name only is shown here, never the value).`,
    );
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const sellerUrl = requireEnv("TEST_NWC_URL");
  const clientUrl = requireEnv("TEST_CLIENT_NWC_URL");
  // Wallet services that host many users on one node report the same node key for
  // everyone, so compare the links themselves. Never print them.
  if (sellerUrl === clientUrl) {
    throw new Error("TEST_NWC_URL and TEST_CLIENT_NWC_URL are the same link. Use two different wallets.");
  }

  const seller = new NWCClient({ nostrWalletConnectUrl: sellerUrl });
  const client = new NWCClient({ nostrWalletConnectUrl: clientUrl });

  try {
    console.log("1. Connecting to both wallets...");
    const sellerInfo = await seller.getInfo();
    const clientInfo = await client.getInfo();
    console.log(`   seller wallet: "${sellerInfo.alias}" on network "${sellerInfo.network}"`);
    console.log(`   client wallet: "${clientInfo.alias}" on network "${clientInfo.network}"`);

    if (sellerInfo.network === "mainnet" || clientInfo.network === "mainnet") {
      console.warn("   NOTE: a wallet reports mainnet. The 100 sats below are real bitcoin.");
    }

    // The app only ever needs to receive. If the seller link can spend, say so loudly.
    console.log(`   seller link permissions: ${sellerInfo.methods.join(", ")}`);
    if (sellerInfo.methods.includes("pay_invoice")) {
      console.warn(
        "   WARNING: the seller link can SPEND (pay_invoice). Create a new link without spending permission.",
      );
    }
    if (!clientInfo.methods.includes("pay_invoice")) {
      throw new Error("The client link cannot pay invoices, so this test cannot run.");
    }

    console.log("2. Reading the seller balance...");
    const before = await seller.getBalance();
    console.log(`   raw balance: ${before.balance} (millisats if the wallet follows NIP-47)`);

    console.log(`3. Making a ${INVOICE_SATS} sat invoice on the seller wallet...`);
    const invoice = await seller.makeInvoice({
      amount: INVOICE_SATS * MSATS_PER_SAT,
      description: "Work Deposits risk test",
      expiry: 600,
    });
    console.log(`   payment_hash: ${invoice.payment_hash}`);
    console.log(`   state: ${invoice.state}`);

    console.log("4. Paying the invoice from the client wallet (test coins)...");
    const paid = await client.payInvoice({ invoice: invoice.invoice });
    console.log(`   client wallet reports fees paid: ${paid.fees_paid}`);

    console.log("5. Waiting for the seller wallet to see the payment...");
    const startedAt = Date.now();
    let settled = false;
    while (Date.now() - startedAt < GIVE_UP_AFTER_MS) {
      const found = await seller.lookupInvoice({ payment_hash: invoice.payment_hash });
      if (found.state === "settled") {
        settled = true;
        break;
      }
      await sleep(POLL_EVERY_MS);
    }

    if (!settled) {
      throw new Error(
        `No settled payment after ${GIVE_UP_AFTER_MS / 1000} seconds. The payment was sent but not detected.`,
      );
    }
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`payment detected (after ${seconds}s of checking)`);

    console.log("6. Confirming the unit by reading the balance again...");
    const after = await seller.getBalance();
    const gained = after.balance - before.balance;
    console.log(`   balance went from ${before.balance} to ${after.balance} (change: ${gained})`);
    if (gained === INVOICE_SATS * MSATS_PER_SAT) {
      console.log("   Unit confirmed: balances and amounts are in millisats.");
    } else {
      console.warn(
        `   Unexpected change. Expected ${INVOICE_SATS * MSATS_PER_SAT} if millisats, or ${INVOICE_SATS} if sats. Tell Claude the numbers above.`,
      );
    }
  } finally {
    seller.close();
    client.close();
  }
}

await main();

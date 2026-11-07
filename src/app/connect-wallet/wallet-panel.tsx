"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Tag } from "@/components/tag";
import { TestCoinsBanner } from "@/components/test-coins-banner";
import { connectWalletAction, disconnectWalletAction, type ConnectState } from "./actions";

const initial: ConnectState = { status: "idle" };

type WalletPanelProps = {
  connected: boolean;
  // Formatted on the server so the server and browser agree on the text.
  connectedOn: string | null;
};

export function WalletPanel({ connected, connectedOn }: WalletPanelProps) {
  const [state, formAction, pending] = useActionState(connectWalletAction, initial);
  const [replacing, setReplacing] = useState(false);

  const showForm = !connected || replacing;

  return (
    <div className="flex flex-col gap-5">
      {connected && (
        <div className="flex flex-col gap-3" role="status">
          <Tag kind="paid">Connected</Tag>
          <p className="text-ink">
            {state.status === "connected"
              ? `Connected to ${state.alias}.`
              : connectedOn
                ? `Your wallet was connected on ${connectedOn}.`
                : "Your wallet is connected."}{" "}
            Money goes straight to it.
          </p>
          {state.status === "connected" && state.testCoins && <TestCoinsBanner />}
        </div>
      )}

      {showForm ? (
        <form action={formAction} className="flex flex-col gap-5">
          <Input
            label="Wallet connection link"
            name="link"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            hint="In your wallet, make a new connection that can receive only, then copy its link."
            error={state.status === "error" ? state.message : undefined}
          />
          <Button type="submit" loading={pending} fullWidth>
            {connected ? "Replace wallet" : "Connect wallet"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => setReplacing(true)}>
            Replace wallet
          </Button>
          <form action={disconnectWalletAction}>
            <Button type="submit" variant="danger" fullWidth>
              Disconnect
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

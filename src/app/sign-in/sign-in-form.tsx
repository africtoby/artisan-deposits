"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { signInAction, type SignInState } from "./actions";

const initial: SignInState = { status: "idle" };

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initial);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3" role="status">
        <h2 className="font-display text-h2 text-ink font-extrabold">Check your email</h2>
        <p className="text-ink">
          We sent a sign-in link to <strong className="font-semibold">{state.email}</strong>. Open
          it on this phone.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        hint="We email you a link. There is no password."
        error={state.status === "error" ? state.message : undefined}
      />
      <Button type="submit" fullWidth loading={pending}>
        Send sign-in link
      </Button>
    </form>
  );
}

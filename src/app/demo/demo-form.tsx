"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { startDemoAction, type StartDemoState } from "./actions";

export function DemoForm() {
  const [state, action, pending] = useActionState<StartDemoState>(startDemoAction, {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.status === "error" && (
        <p role="alert" className="rounded-control bg-error-tint text-small text-error px-4 py-3">
          {state.message}
        </p>
      )}
      <Button type="submit" fullWidth loading={pending}>
        Try the demo
      </Button>
    </form>
  );
}

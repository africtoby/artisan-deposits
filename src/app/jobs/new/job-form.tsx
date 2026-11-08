"use client";

import { useActionState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/money/currencies";
import { createJobAction, type CreateJobState } from "./actions";

const initial: CreateJobState = { status: "idle" };

export function JobForm({ defaultCurrency }: { defaultCurrency: string }) {
  const [state, formAction, pending] = useActionState(createJobAction, initial);
  const fields = state.status === "error" ? state.fields : {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label="Client name"
        name="clientName"
        autoComplete="off"
        required
        error={fields.clientName}
      />
      <Input
        label="What is the job"
        name="title"
        autoComplete="off"
        required
        hint="For example: wedding dress, or logo for a bakery."
        error={fields.title}
      />
      <Input label="Details (optional)" name="details" autoComplete="off" error={fields.details} />
      <Input label="Deadline (optional)" name="deadline" type="date" error={fields.deadline} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="currency" className="text-ink font-semibold">
          Currency
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={defaultCurrency}
          aria-invalid={fields.currency ? true : undefined}
          className="rounded-control bg-surface text-body text-ink border-ink-soft min-h-12 w-full border-[1.5px] px-4"
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}, {CURRENCIES[code].name}
            </option>
          ))}
        </select>
        {fields.currency && <p className="text-small text-error">{fields.currency}</p>}
      </div>

      <Input
        label="Price"
        name="price"
        inputMode="decimal"
        autoComplete="off"
        required
        error={fields.price}
      />
      <Input
        label="Deposit"
        name="deposit"
        inputMode="decimal"
        autoComplete="off"
        required
        hint="What the client pays now. The rest is the balance."
        error={fields.deposit}
      />

      {state.status === "error" && state.message && (
        <p role="alert" className="text-small text-error">
          {state.message}
        </p>
      )}
      <Button type="submit" fullWidth loading={pending}>
        Create job
      </Button>
    </form>
  );
}

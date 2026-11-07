import type { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="text-body text-ink max-w-[40ch]">{message}</p>
      {action}
    </div>
  );
}

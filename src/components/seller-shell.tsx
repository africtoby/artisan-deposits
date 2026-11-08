import { Suspense, type ReactNode } from "react";
import { TabBar } from "./tab-bar";

// Wraps the signed-in seller screens. The bottom padding keeps the last row clear of the bar.
export function SellerShell({ children }: { children: ReactNode }) {
  return (
    <div className="pb-20">
      {children}
      <Suspense>
        <TabBar />
      </Suspense>
    </div>
  );
}

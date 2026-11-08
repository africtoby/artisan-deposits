import { Suspense } from "react";
import { DemoBanner } from "@/components/demo-banner";
import { SellerShell } from "@/components/seller-shell";

export default function JobsLayout({ children }: LayoutProps<"/jobs">) {
  return (
    <SellerShell>
      <Suspense>
        <DemoBanner />
      </Suspense>
      {children}
    </SellerShell>
  );
}

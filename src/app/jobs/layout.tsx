import { SellerShell } from "@/components/seller-shell";

export default function JobsLayout({ children }: LayoutProps<"/jobs">) {
  return <SellerShell>{children}</SellerShell>;
}

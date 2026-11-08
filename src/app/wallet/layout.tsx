import { SellerShell } from "@/components/seller-shell";

export default function WalletLayout({ children }: LayoutProps<"/wallet">) {
  return <SellerShell>{children}</SellerShell>;
}

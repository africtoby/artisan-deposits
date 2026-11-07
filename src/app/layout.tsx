import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Big_Shoulders } from "next/font/google";
import "./globals.css";

// Google now ships "Big Shoulders Display" as part of one "Big Shoulders" family with an
// optical-size axis. At large sizes the axis picks the Display cut, so it is the same face.
const display = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-big-shoulders",
});

const text = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: { default: "Work Deposits", template: "%s | Work Deposits" },
  description:
    "Get paid a deposit, and later the balance, by Lightning straight into your own wallet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eceff7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

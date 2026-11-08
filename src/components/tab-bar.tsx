"use client";

import { Briefcase, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/jobs", label: "Jobs", Icon: Briefcase },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
] as const;

// Fixed to the bottom of the screen, where a thumb reaches it. Icon and word together, because
// an icon alone is easy to misread.
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="border-dye-line bg-surface fixed inset-x-0 bottom-0 z-10 border-t"
    >
      <ul className="mx-auto flex max-w-[480px]">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-small flex min-h-14 flex-col items-center justify-center gap-0.5",
                  active ? "text-indigo font-semibold" : "text-ink-soft",
                )}
              >
                <Icon size={22} strokeWidth={1.5} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

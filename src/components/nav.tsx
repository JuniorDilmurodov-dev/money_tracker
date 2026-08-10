"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n";

const LINKS = [
  { href: "/", key: "add", icon: "＋" },
  { href: "/week", key: "week", icon: "▤" },
  { href: "/month", key: "month", icon: "▦" },
  { href: "/history", key: "history", icon: "☰" },
  { href: "/insights", key: "insights", icon: "✦" },
] satisfies { href: string; key: keyof Dictionary["nav"]; icon: string }[];

export function Nav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-1/95 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-2 sm:justify-start sm:gap-1 sm:px-0">
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="flex-1 sm:flex-none">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:text-sm ${
                  active
                    ? "text-ink sm:bg-surface-2"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                <span aria-hidden className="text-base leading-none sm:text-sm">
                  {link.icon}
                </span>
                {t.nav[link.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

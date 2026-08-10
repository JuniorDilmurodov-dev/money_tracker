import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/lib/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already gates this, but a layout that renders user data should
  // never assume the gate ran.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { t } = await getT();

  return (
    // The bottom nav is fixed and pads itself for the home indicator, so the
    // scrolling content has to clear both or the last card hides behind it.
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pb-10">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          {t.appName}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link
            href="/settings"
            aria-label={t.header.settings}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-2 text-ink-2 transition-colors hover:text-ink"
          >
            <span aria-hidden className="text-sm">
              ⚙
            </span>
          </Link>
        </div>
      </header>

      <div className="hidden sm:mb-4 sm:block">
        <Nav />
      </div>

      <main className="flex-1">{children}</main>

      <div className="sm:hidden">
        <Nav />
      </div>
    </div>
  );
}

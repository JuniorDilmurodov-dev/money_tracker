import Link from "next/link";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already gates this, but a layout that renders user data should
  // never assume the gate ran.
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-24 pt-4 sm:pb-10">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Xarajat
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/settings"
            aria-label="Settings"
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

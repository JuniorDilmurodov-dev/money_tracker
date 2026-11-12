import Link from "next/link";

import { currencyLabel } from "@/lib/currency";
import type { Dictionary } from "@/lib/i18n";
import { CURRENCIES, type Currency } from "@/lib/types";

/** Pill tabs that switch a page's charts between currencies via `?cur=`. */
export function CurrencyTabs({ active, t }: { active: Currency; t: Dictionary }) {
  return (
    <nav
      aria-label={t.expense.currency}
      className="flex gap-0.5 rounded-full border border-line bg-surface-2 p-0.5"
    >
      {CURRENCIES.map((c) => (
        <Link
          key={c}
          href={`?cur=${c}`}
          replace
          scroll={false}
          aria-current={c === active ? "true" : undefined}
          className={`flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors ${
            c === active ? "bg-surface-1 text-ink" : "text-ink-3 hover:text-ink"
          }`}
        >
          {currencyLabel(c, t)}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import { currencyLabel } from "@/lib/currency";
import type { Dictionary } from "@/lib/i18n";
import { CURRENCIES, type Currency } from "@/lib/types";

/** Two-button segmented control for picking an expense's currency. */
export function CurrencyToggle({
  value,
  onChange,
  t,
}: {
  value: Currency;
  onChange: (next: Currency) => void;
  t: Dictionary;
}) {
  return (
    <div
      role="group"
      aria-label={t.expense.currency}
      className="grid grid-cols-2 gap-0.5 rounded-full border border-line bg-surface-2 p-0.5"
    >
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          className={`h-8 rounded-full px-4 text-sm font-medium transition-colors ${
            c === value ? "bg-surface-1 text-ink" : "text-ink-3 hover:text-ink"
          }`}
        >
          {currencyLabel(c, t)}
        </button>
      ))}
    </div>
  );
}

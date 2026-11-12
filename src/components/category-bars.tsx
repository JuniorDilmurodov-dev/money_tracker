import { formatMoney } from "@/lib/currency";
import { translateCategory } from "@/lib/i18n/categories";
import type { Dictionary } from "@/lib/i18n";
import type { CategoryTotal, Currency } from "@/lib/types";

/**
 * Ranked horizontal bars, one hue.
 *
 * A single-series form on purpose: comparing seven categories by length is
 * easier than by hue around a donut, every bar is directly labelled with its
 * name, amount and share, and identity never depends on color.
 */
export function CategoryBars({
  totals,
  t,
  currency = "UZS",
}: {
  totals: CategoryTotal[];
  t: Dictionary;
  currency?: Currency;
}) {
  const max = Math.max(...totals.map((entry) => entry.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {totals.map((entry) => {
        const name = translateCategory(entry.category, t);
        const amount = formatMoney(entry.total, currency, t);
        const share = Math.round(entry.share);

        return (
          <li key={entry.category}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink-2">{name}</span>
              <span className="tnum shrink-0 text-sm font-medium">
                {amount}
                <span className="ml-2 text-ink-3">{share}%</span>
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={t.chart.categoryShare(name, amount, share)}
            >
              <div
                className="h-full rounded-full bg-series-1"
                style={{ width: `${Math.max((entry.total / max) * 100, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

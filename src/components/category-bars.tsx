import { formatSom } from "@/lib/money";
import type { CategoryTotal } from "@/lib/types";

/**
 * Ranked horizontal bars, one hue.
 *
 * A single-series form on purpose: comparing seven categories by length is
 * easier than by hue around a donut, every bar is directly labelled with its
 * name, amount and share, and identity never depends on color.
 */
export function CategoryBars({ totals }: { totals: CategoryTotal[] }) {
  const max = Math.max(...totals.map((t) => t.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {totals.map((t) => (
        <li key={t.category}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-ink-2">{t.category}</span>
            <span className="tnum shrink-0 text-sm font-medium">
              {formatSom(t.total)}
              <span className="ml-2 text-ink-3">{Math.round(t.share)}%</span>
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label={`${t.category}: ${formatSom(t.total)}, ${Math.round(t.share)} percent of the period`}
          >
            <div
              className="h-full rounded-full bg-series-1"
              style={{ width: `${Math.max((t.total / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

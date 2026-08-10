"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DateField } from "@/components/date-field";
import { addDays, addMonths, startOfMonth, today } from "@/lib/dates";
import { useT } from "@/lib/i18n/client";
import { translateCategory } from "@/lib/i18n/categories";
import type { Category } from "@/lib/types";

type Values = { from: string; to: string; category: string };

/** Filters live in the URL, so a filtered view is shareable and survives reload. */
export function HistoryFilters({
  categories,
  initial,
}: {
  categories: Category[];
  initial: Values;
}) {
  const router = useRouter();
  const t = useT();
  const [values, setValues] = useState<Values>(initial);

  function apply(next: Values) {
    setValues(next);
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.category) params.set("category", next.category);
    const query = params.toString();
    router.push(query ? `/history?${query}` : "/history");
  }

  const now = today();
  const presets = [
    { label: t.history.last7Days, from: addDays(now, -6), to: now },
    { label: t.history.last30Days, from: addDays(now, -29), to: now },
    { label: t.history.thisMonth, from: startOfMonth(now), to: now },
    {
      label: t.history.lastMonth,
      from: startOfMonth(addMonths(now, -1)),
      to: addDays(startOfMonth(now), -1),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar fade-right -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        {presets.map((preset) => {
          const active = values.from === preset.from && values.to === preset.to;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                apply({ ...values, from: preset.from, to: preset.to })
              }
              className={`h-9 shrink-0 rounded-full border px-3 text-sm transition-colors ${
                active
                  ? "border-line-strong bg-surface-2 text-ink"
                  : "border-line bg-surface-2 text-ink-3 hover:border-line-strong hover:text-ink"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">{t.history.from}</span>
          <DateField
            value={values.from}
            onChange={(from) => apply({ ...values, from })}
            allowClear
            className="rounded-lg"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">{t.history.to}</span>
          <DateField
            value={values.to}
            onChange={(to) => apply({ ...values, to })}
            allowClear
            className="rounded-lg"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">{t.history.category}</span>
        <select
          value={values.category}
          onChange={(e) => apply({ ...values, category: e.target.value })}
          className="h-11 rounded-lg border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong sm:text-sm"
        >
          <option value="">{t.history.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {translateCategory(c.name, t)}
            </option>
          ))}
        </select>
      </label>

      {(values.from || values.to || values.category) && (
        <button
          type="button"
          onClick={() => apply({ from: "", to: "", category: "" })}
          className="self-start text-sm text-ink-3 underline"
        >
          {t.history.clearFilters}
        </button>
      )}
    </div>
  );
}

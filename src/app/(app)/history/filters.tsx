"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addDays, addMonths, startOfMonth, today } from "@/lib/dates";
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
    { label: "Last 7 days", from: addDays(now, -6), to: now },
    { label: "Last 30 days", from: addDays(now, -29), to: now },
    { label: "This month", from: startOfMonth(now), to: now },
    { label: "Last month", from: startOfMonth(addMonths(now, -1)), to: addDays(startOfMonth(now), -1) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
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
                  : "border-line text-ink-3"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">From</span>
          <input
            type="date"
            value={values.from}
            onChange={(e) => apply({ ...values, from: e.target.value })}
            className="h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-line-strong"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">To</span>
          <input
            type="date"
            value={values.to}
            onChange={(e) => apply({ ...values, to: e.target.value })}
            className="h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-line-strong"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">Category</span>
        <select
          value={values.category}
          onChange={(e) => apply({ ...values, category: e.target.value })}
          className="h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none focus:border-line-strong"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
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
          Clear filters
        </button>
      )}
    </div>
  );
}

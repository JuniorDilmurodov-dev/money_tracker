"use client";

import { Cell, Pie, PieChart } from "recharts";

/** Slot → CSS variable. Both themes define these in globals.css. */
const SLICE_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--slice-3)",
  "var(--slice-4)",
] as const;
const OTHER_COLOR = "var(--slice-5)";

export type DonutSlice = {
  name: string;
  /** Raw amount: sizes the arc. */
  value: number;
  /** Already formatted on the server ("1 240 000 so'm"). */
  amount: string;
  pct: number;
  isOther: boolean;
};

const SIZE = 176;

/**
 * Donut plus a legend that carries every fact the chart does. The legend is
 * the accessible reading of the chart — name, share and amount in text — so
 * colour only ever *helps* tell slices apart and is never the only signal.
 */
export function WeeklyDonut({ slices, ariaLabel }: { slices: DonutSlice[]; ariaLabel: string }) {
  const colorFor = (slice: DonutSlice, index: number) =>
    slice.isOther ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div role="img" aria-label={ariaLabel} className="shrink-0">
        {/* Fixed size, not ResponsiveContainer: it measures 0×0 on the server
            and warns until the client lays out. */}
        <PieChart width={SIZE} height={SIZE} aria-hidden>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={54}
            outerRadius={80}
            paddingAngle={slices.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice, i) => (
              <Cell key={slice.name} fill={colorFor(slice, i)} />
            ))}
          </Pie>
        </PieChart>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-2.5">
        {slices.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: colorFor(slice, i) }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{slice.name}</span>
            <span className="tnum shrink-0 text-sm font-medium">
              {slice.amount}
              <span className="ml-2 inline-block w-9 text-right text-ink-3">{slice.pct}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

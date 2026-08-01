"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompact, formatSom } from "@/lib/money";

export type DailyPoint = {
  label: string; // "Mon", or "1", "2" … for a month
  current: number;
  previous: number | null;
};

function ChartTooltip({
  active,
  payload,
  label,
  currentLabel,
  previousLabel,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | string }[];
  label?: string | number;
  currentLabel: string;
  previousLabel: string;
}) {
  if (!active || !payload?.length) return null;

  const read = (key: string) => {
    const entry = payload.find((p) => p.dataKey === key);
    return entry?.value == null ? null : Number(entry.value);
  };

  const current = read("current");
  const previous = read("previous");

  return (
    <div className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink">{label}</div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: "var(--series-1)" }}
          />
          <span className="text-ink-3">{currentLabel}</span>
          <span className="tnum ml-auto font-medium text-ink">
            {formatSom(current ?? 0)}
          </span>
        </div>
        {previous !== null && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: "var(--series-2)" }}
            />
            <span className="text-ink-3">{previousLabel}</span>
            <span className="tnum ml-auto font-medium text-ink">
              {formatSom(previous)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Daily spending for the current period, with the previous period behind it.
 * Two series, so a legend is always present.
 *
 * Straight segments, not a smoothed curve: daily totals are discrete, and
 * spline interpolation draws a bulge through days that had no spending at all.
 */
export function DailyLine({
  data,
  currentLabel,
  previousLabel,
  showPrevious = true,
}: {
  data: DailyPoint[];
  currentLabel: string;
  previousLabel: string;
  showPrevious?: boolean;
}) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full"
            style={{ background: "var(--series-1)" }}
          />
          {currentLabel}
        </li>
        {showPrevious && (
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-4 rounded-full"
              style={{ background: "var(--series-2)" }}
            />
            {previousLabel}
          </li>
        )}
      </ul>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid
              stroke="var(--grid)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--grid)" }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              content={
                <ChartTooltip
                  currentLabel={currentLabel}
                  previousLabel={previousLabel}
                />
              }
            />
            {showPrevious && (
              <Line
                type="linear"
                dataKey="previous"
                stroke="var(--series-2)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                connectNulls
              />
            )}
            <Line
              type="linear"
              dataKey="current"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--series-1)" }}
              activeDot={{ r: 5, stroke: "var(--surface-1)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

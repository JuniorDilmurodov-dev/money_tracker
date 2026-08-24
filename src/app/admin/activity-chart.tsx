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

import { formatAmount } from "@/lib/money";

export type ActivityPoint = {
  label: string; // "08-15"
  activeUsers: number;
  expenseCount: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const read = (key: string) => {
    const entry = payload.find((p) => p.dataKey === key);
    return entry?.value == null ? 0 : Number(entry.value);
  };

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
          <span className="text-ink-3">Active users</span>
          <span className="tnum ml-auto font-medium text-ink">
            {formatAmount(read("activeUsers"))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: "var(--series-2)" }}
          />
          <span className="text-ink-3">Expenses added</span>
          <span className="tnum ml-auto font-medium text-ink">
            {formatAmount(read("expenseCount"))}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Daily active users and expenses-added counts, last 30 days.
 * Mirrors src/components/daily-line.tsx's tokens and layout so the admin
 * page reads as part of the same app rather than a bolted-on tool.
 */
export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full"
            style={{ background: "var(--series-1)" }}
          />
          Active users
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full"
            style={{ background: "var(--series-2)" }}
          />
          Expenses added
        </li>
      </ul>

      <div className="h-48 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="0" vertical={false} />
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
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              content={<ChartTooltip />}
            />
            <Line
              type="linear"
              dataKey="activeUsers"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: "var(--series-1)" }}
              activeDot={{ r: 5, stroke: "var(--surface-1)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="expenseCount"
              stroke="var(--series-2)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

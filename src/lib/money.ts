/** UZS has no practical subunit — everything is displayed as whole so'm. */

/** 150000 → "150 000" */
export function formatAmount(value: number): string {
  return Math.round(value)
    .toLocaleString("en-US")
    .replace(/,/g, " "); // non-breaking spaces so amounts never wrap mid-number
}

/** 150000 → "150 000 so'm" */
export function formatSom(value: number): string {
  return `${formatAmount(value)} so'm`;
}

/** Compact form for chart axes: 150000 → "150k", 1500000 → "1.5M" */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

/**
 * Percent change from `previous` to `current`.
 * Returns null when there's no baseline to compare against.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(pct: number | null): string {
  if (pct === null) return "—";
  const rounded = Math.round(pct);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * Parse a user-typed amount. Accepts "150000", "150 000", "150,000", "150.000"
 * — all common ways of typing so'm on a phone.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[\s ,]/g, "").replace(/\.(?=\d{3}\b)/g, "");
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

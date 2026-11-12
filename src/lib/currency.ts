import type { ChangeEvent } from "react";

import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import {
  formatAmount,
  formatAmountInput,
  formatCompact,
  formatSom,
  handleAmountInputChange,
  parseAmount,
  percentChange,
} from "@/lib/money";
import { CURRENCIES, type Currency, type Totals } from "@/lib/types";

/**
 * Multi-currency layer over `money.ts`. UZS always delegates to the original
 * helpers so UZS-only output is unchanged; USD (two decimals) lives here.
 *
 * Amounts in different currencies are never converted or added together.
 */

/** numeric(14, 2) holds 12 integer digits. */
const MAX_USD = 1e12;

/** "USD", or the translated so'm word. */
export function currencyLabel(c: Currency, t: Dictionary): string {
  return c === "USD" ? "USD" : t.currency;
}

/**
 * UZS: 150000 → "150 000" (exactly `formatAmount`).
 * USD: 400 → "400", 12.5 → "12.5", 1234.56 → "1 234.56" — cents only when
 * non-zero, grouped with the same non-breaking space as `formatAmount`.
 */
export function formatAmountFor(value: number, currency: Currency): string {
  if (currency === "UZS") return formatAmount(value);
  if (!Number.isFinite(value)) return "0";

  const fixed = Math.abs(value).toFixed(2);
  const [int, cents] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  // A negative that rounds to zero must not print as "-0".
  const sign = value < 0 && fixed !== "0.00" ? "-" : "";
  const decimals = cents === "00" ? "" : cents.replace(/0$/, "");
  return `${sign}${grouped}${decimals ? `.${decimals}` : ""}`;
}

/** 400 USD → "400 USD"; UZS → what `formatSom` returns ("12 000 000 so'm"). */
export function formatMoney(value: number, currency: Currency, t: Dictionary): string {
  if (currency === "UZS") return formatSom(value, t);
  return `${formatAmountFor(value, currency)} ${currencyLabel(currency, t)}`;
}

/** Non-zero currencies joined with " + " (UZS first); "0 so'm" if all are zero. */
export function formatTotals(totals: Totals, t: Dictionary): string {
  const parts = CURRENCIES.filter((c) => totals[c] > 0).map((c) =>
    formatMoney(totals[c], c, t),
  );
  return parts.length > 0 ? parts.join(" + ") : formatSom(0, t);
}

/** Axis labels: UZS as `formatCompact`; USD keeps cents for small values. */
export function formatCompactFor(value: number, currency: Currency): string {
  if (currency === "UZS" || Math.abs(value) >= 1_000) return formatCompact(value);
  return String(Number(value.toFixed(2)));
}

/** Per-currency change versus the previous period; null = no baseline. */
export function percentChangeByCurrency(
  current: Totals,
  previous: Totals,
): Record<Currency, number | null> {
  return {
    UZS: percentChange(current.UZS, previous.UZS),
    USD: percentChange(current.USD, previous.USD),
  };
}

/**
 * The currency a page should chart. An explicit `?cur=` wins; otherwise UZS,
 * unless every given period has USD data and no UZS data.
 */
export function pickCurrency(
  param: string | string[] | undefined,
  ...totals: Totals[]
): Currency {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === "UZS" || raw === "USD") {
    // An explicit choice only holds if it has something to show; otherwise a
    // stale ?cur= would strand the page on an empty state with no tabs.
    const other = raw === "USD" ? "UZS" : "USD";
    if (totals.some((t) => t[raw] > 0) || !totals.some((t) => t[other] > 0)) return raw;
  }
  const hasUzs = totals.some((t) => t.UZS > 0);
  const hasUsd = totals.some((t) => t.USD > 0);
  return hasUsd && !hasUzs ? "USD" : "UZS";
}

/**
 * Parse a typed amount. UZS delegates to `parseAmount`.
 *
 * USD accepts "12.5", "12,5" (a comma followed by 1–2 digits is a decimal
 * comma), ".5" and "1 000.99"; commas are otherwise thousands separators and
 * must sit in groups of three. At most two decimals; must be positive and fit
 * numeric(14, 2).
 */
export function parseAmountFor(input: string, currency: Currency): number | null {
  if (currency === "UZS") return parseAmount(input);

  const s = input.replace(/[\s ]/g, "");
  let normalized: string;
  if (/^\d+,\d{1,2}$/.test(s)) {
    normalized = s.replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    normalized = s.replace(/,/g, "");
  } else {
    normalized = s;
  }
  if (normalized.startsWith(".")) normalized = `0${normalized}`;
  if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value >= MAX_USD) return null;
  return value;
}

/**
 * Live-typing formatter. UZS delegates to `formatAmountInput`. USD: digits
 * grouped with spaces, one ".", comma typed as ".", at most two decimals.
 */
export function formatAmountInputFor(raw: string, currency: Currency): string {
  if (currency === "UZS") return formatAmountInput(raw);

  // A pasted "1,200" or "1,234,567.8" is thousands grouping, not a decimal
  // comma (a typed comma never survives long enough to look like this).
  const compact = raw.replace(/[\s\u00A0]/g, "");
  const grouped = /^\d{1,3}(,\d{3})+(\.\d*)?$/.test(compact) ? compact.replace(/,/g, "") : raw;
  let cleaned = grouped.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot !== -1) {
    cleaned = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
  }
  const [intPart, decPart] = cleaned.split(".");
  const spaced = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decPart === undefined ? spaced : `${spaced}.${decPart.slice(0, 2)}`;
}

/**
 * What an already-typed amount becomes when the toggle flips. USD → UZS drops
 * the cents (UZS is whole so'm); UZS → USD only needs regrouping.
 */
export function switchAmountInput(raw: string, to: Currency): string {
  if (to === "UZS") return formatAmountInput(raw.split(/[.,]/)[0] ?? "");
  return formatAmountInputFor(raw, to);
}

/**
 * Formats as the user types and keeps the caret on the same character. UZS
 * delegates to `handleAmountInputChange`. USD counts the decimal point as part
 * of the caret position too, so typing "." doesn't leave the caret before it.
 */
export function handleAmountInputChangeFor(
  e: ChangeEvent<HTMLInputElement>,
  onFormatted: (value: string) => void,
  currency: Currency,
): void {
  if (currency === "UZS") return handleAmountInputChange(e, onFormatted);

  const input = e.target;
  const cursor = input.selectionStart ?? input.value.length;
  const significantBefore = input.value.slice(0, cursor).replace(/[^\d.,]/g, "").length;
  const formatted = formatAmountInputFor(input.value, currency);
  onFormatted(formatted);

  requestAnimationFrame(() => {
    let pos = formatted.length;
    if (significantBefore === 0) {
      pos = 0;
    } else {
      let count = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/[\d.]/.test(formatted[i])) count++;
        if (count === significantBefore) {
          pos = i + 1;
          break;
        }
      }
    }
    input.setSelectionRange(pos, pos);
  });
}

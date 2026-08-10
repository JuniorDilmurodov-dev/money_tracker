/**
 * All date handling works on plain "YYYY-MM-DD" strings, which is also how
 * Postgres stores `date`. This sidesteps every UTC-offset bug that comes from
 * pushing Date objects around between a UTC server and a UTC+5 phone.
 *
 * "Today" is resolved in a fixed app timezone rather than the server's, so a
 * midnight expense doesn't land on the wrong day.
 */
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Tashkent";

function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

export type ISODate = string; // "YYYY-MM-DD"

/** Today in the app timezone. */
export function today(): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Treat an ISO date as noon UTC so DST/offset shifts can never move the day. */
function toDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function toISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = toDate(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

/** Days between two ISO dates (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

/** Monday-start week. */
export function startOfWeek(iso: ISODate): ISODate {
  const d = toDate(iso);
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  return addDays(iso, -dow);
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(iso), 1), -1);
}

/** Inclusive list of dates from `from` to `to`. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export type Range = { from: ISODate; to: ISODate };

export function weekRange(iso: ISODate): Range {
  const from = startOfWeek(iso);
  return { from, to: addDays(from, 6) };
}

export function monthRange(iso: ISODate): Range {
  return { from: startOfMonth(iso), to: endOfMonth(iso) };
}

// ---------------------------------------------------------------------------
// Display formatting. Every function takes the active locale — none of these
// may fall back to a hardcoded language, or a Russian page ends up with English
// month names in its headings.
// ---------------------------------------------------------------------------

/**
 * CLDR gives Russian months a trailing " г." and Uzbek a comma before the
 * year, and both start lowercase. In a page heading that reads as a typo, so
 * the year separator is dropped and the first letter is raised.
 */
function asHeading(text: string): string {
  const cleaned = text.replace(/\s*г\.$/, "").replace(/,\s+/g, " ").trim();
  return cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1);
}

/** "Mon" / "пн" / "Du" */
export function weekdayShort(iso: ISODate, locale: Locale): string {
  return asHeading(
    new Intl.DateTimeFormat(intlLocale(locale), {
      weekday: "short",
      timeZone: "UTC",
    }).format(toDate(iso)),
  );
}

/** "5 Aug" / "5 авг." / "5-avg" */
export function formatDayMonth(iso: ISODate, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toDate(iso));
}

/** "August 2026" / "Август 2026" / "Avgust 2026" */
export function formatMonthYear(iso: ISODate, locale: Locale): string {
  return asHeading(
    new Intl.DateTimeFormat(intlLocale(locale), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(toDate(iso)),
  );
}

/** "5 Aug 2026" */
export function formatFullDate(iso: ISODate, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(toDate(iso));
}

/** "Today", "Yesterday", or the day and month. */
export function formatRelativeDay(
  iso: ISODate,
  locale: Locale,
  t: Dictionary,
  reference = today(),
): string {
  const diff = daysBetween(iso, reference);
  if (diff === 0) return t.dates.today;
  if (diff === 1) return t.dates.yesterday;
  return formatDayMonth(iso, locale);
}

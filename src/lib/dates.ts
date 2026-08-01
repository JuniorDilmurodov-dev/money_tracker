/**
 * All date handling works on plain "YYYY-MM-DD" strings, which is also how
 * Postgres stores `date`. This sidesteps every UTC-offset bug that comes from
 * pushing Date objects around between a UTC server and a UTC+5 phone.
 *
 * "Today" is resolved in a fixed app timezone rather than the server's, so a
 * midnight expense doesn't land on the wrong day.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Tashkent";

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

/** "Mon", "Tue", … */
export function weekdayShort(iso: ISODate): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(toDate(iso));
}

/** "5 Aug" */
export function formatDayMonth(iso: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toDate(iso));
}

/** "August 2026" */
export function formatMonthYear(iso: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toDate(iso));
}

/** "5 Aug 2026" */
export function formatFullDate(iso: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(toDate(iso));
}

/** "Today", "Yesterday", or "5 Aug". */
export function formatRelativeDay(iso: ISODate, reference = today()): string {
  const diff = daysBetween(iso, reference);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDayMonth(iso);
}

/**
 * Weekly digest: pure statistics and push copy. No imports on purpose, so the
 * cron route, the /haftalik page and the boundary tests all share it without
 * dragging in server-only code.
 *
 * Currencies are never mixed: every figure is computed per currency.
 */

export type DigestCurrency = "UZS" | "USD";
export const DIGEST_CURRENCIES: readonly DigestCurrency[] = ["UZS", "USD"];

export type DigestRow = { amount: number; category: string; currency: DigestCurrency };

export type DigestSlice = {
  /** Raw category name, or "Boshqa" when `isOther`. Translate before display. */
  name: string;
  amount: number;
  /** Share of the currency total, whole percent. */
  pct: number;
  isOther: boolean;
};

export type CurrencyDigest = {
  total: number;
  prevTotal: number;
  /** null when there is no previous week to compare with. */
  changePct: number | null;
  topCategory: { name: string; sharePct: number } | null;
  /** Top 4 categories + "Boshqa" (only when there are more than 4). */
  slices: DigestSlice[];
  count: number;
};

export type WeeklyDigest = {
  weekStart: string;
  byCurrency: Record<DigestCurrency, CurrencyDigest>;
  /** Expense count across currencies (a count, not a sum). */
  count: number;
};

const TOP_SLICES = 4;
export const OTHER_SLICE = "Boshqa";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function digestFor(rows: DigestRow[], prevRows: DigestRow[]): CurrencyDigest {
  const total = round2(rows.reduce((a, r) => a + r.amount, 0));
  const prevTotal = round2(prevRows.reduce((a, r) => a + r.amount, 0));

  const byCategory = new Map<string, number>();
  for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
  const ranked = [...byCategory.entries()]
    .map(([name, amount]) => ({ name, amount: round2(amount) }))
    // Name as tie-break keeps the order (and so the push text) deterministic.
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

  const pctOf = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
  const slices: DigestSlice[] = ranked.slice(0, TOP_SLICES).map((c) => ({
    name: c.name,
    amount: c.amount,
    pct: pctOf(c.amount),
    isOther: false,
  }));
  const rest = ranked.slice(TOP_SLICES);
  if (rest.length > 0) {
    const amount = round2(rest.reduce((a, c) => a + c.amount, 0));
    slices.push({ name: OTHER_SLICE, amount, pct: pctOf(amount), isOther: true });
  }

  return {
    total,
    prevTotal,
    changePct: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null,
    topCategory: ranked[0] ? { name: ranked[0].name, sharePct: pctOf(ranked[0].amount) } : null,
    slices,
    count: rows.length,
  };
}

export function computeWeeklyDigest(
  weekStart: string,
  current: DigestRow[],
  previous: DigestRow[],
): WeeklyDigest {
  const pick = (rows: DigestRow[], c: DigestCurrency) => rows.filter((r) => r.currency === c);
  return {
    weekStart,
    byCurrency: {
      UZS: digestFor(pick(current, "UZS"), pick(previous, "UZS")),
      USD: digestFor(pick(current, "USD"), pick(previous, "USD")),
    },
    count: current.length,
  };
}

// ---------------------------------------------------------------------------
// Money for push copy
// ---------------------------------------------------------------------------

function trimDecimal(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.?0+$/, "").replace(".", ",");
}

/** 850 000 → "850 ming so'm", 1 240 000 → "1,2 mln so'm", USD → "40 USD". */
export function formatDigestMoney(value: number, currency: DigestCurrency): string {
  if (currency === "USD") {
    return `${trimDecimal(value, 2)} USD`;
  }
  const thousands = Math.round(value / 1_000);
  // 999 600 rounds up to 1000 ming — say "1 mln" instead.
  if (value >= 1_000_000 || thousands >= 1_000) {
    return `${trimDecimal(value / 1_000_000, 1)} mln so'm`;
  }
  if (thousands >= 1) return `${thousands} ming so'm`;
  return `${Math.round(value)} so'm`;
}

// ---------------------------------------------------------------------------
// Notification copy
// ---------------------------------------------------------------------------

const TITLES = [
  "Haftangiz hisoboti tayyor 📊",
  "Bu hafta qancha ketdi? 👀",
  "Hafta yakuni: natijangiz 📊",
  "Haftalik tahlil tayyor ✨",
] as const;

const EMPTY_TITLE = "Bu hafta bo'sh qoldi 📝";
const EMPTY_BODY = "Xarajatlaringizni yozib, keyingi hafta tahlil oling";

const TITLE_MAX = 30;
const BODY_MAX = 90;
const CHANGE_THRESHOLD = 5;

/** ISO-8601 week number of a "YYYY-MM-DD" date — drives the title rotation. */
export function isoWeekNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7; // Mon=1 … Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dow); // Thursday of this week
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export type DigestNotification = { title: string; body: string; url: string };

function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/**
 * @param categoryName maps a stored category to its display name (the cron
 *   passes the Uzbek translation; the digest is always sent in Uzbek).
 */
export function buildDigestNotification(
  digest: WeeklyDigest,
  categoryName: (stored: string) => string = (s) => s,
): DigestNotification {
  const url = `/haftalik?w=${digest.weekStart}`;
  const active = DIGEST_CURRENCIES.filter((c) => digest.byCurrency[c].count > 0);

  if (active.length === 0) return { title: EMPTY_TITLE, body: EMPTY_BODY, url };

  const title = clip(TITLES[isoWeekNumber(digest.weekStart) % TITLES.length], TITLE_MAX);

  if (active.length > 1) {
    const money = active.map((c) => formatDigestMoney(digest.byCurrency[c].total, c)).join(" + ");
    return { title, body: clip(`${money} — batafsil tahlilni ko'ring`, BODY_MAX), url };
  }

  const currency = active[0];
  const d = digest.byCurrency[currency];
  const money = formatDigestMoney(d.total, currency);
  const top = categoryName(d.topCategory!.name);
  const pct = d.changePct;

  let build: (cat: string) => string;
  if (pct !== null && pct < -CHANGE_THRESHOLD) {
    build = (cat) => `${money} — o'tgan haftadan ${Math.round(-pct)}% kam 👏 Eng ko'p: ${cat}`;
  } else if (pct !== null && pct > CHANGE_THRESHOLD) {
    build = (cat) => `${money} — o'tgan haftadan ${Math.round(pct)}% ko'p. Eng ko'p: ${cat}`;
  } else {
    build = (cat) => `${money} sarfladingiz. Eng ko'p: ${cat} (${d.topCategory!.sharePct}%)`;
  }

  // A very long user-made category name must not push the body over its cap.
  const overflow = [...build(top)].length - BODY_MAX;
  const fitted = overflow > 0 ? clip(top, Math.max([...top].length - overflow, 3)) : top;
  return { title, body: clip(build(fitted), BODY_MAX), url };
}

import { Card, EmptyState } from "@/components/ui";
import { CurrencyTabs } from "@/components/currency-tabs";
import { WeeklyDonut, type DonutSlice } from "@/components/weekly-donut";
import { addDays, formatDayMonth, startOfWeek, today } from "@/lib/dates";
import { formatMoney, pickCurrency } from "@/lib/currency";
import { translateCategory } from "@/lib/i18n/categories";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, type Totals } from "@/lib/types";
import { getWeeklyDigest } from "@/lib/weekly-digest-data";
import { AiSummary } from "./ai-summary";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.weekly };
}

/**
 * `?w=` is a Monday ("YYYY-MM-DD"). Anything that isn't a real date, or lies
 * in the future, falls back to the current week; a real date mid-week is
 * snapped to its Monday so a hand-edited URL still lands somewhere sensible.
 */
function resolveWeek(raw: string | string[] | undefined, now: string): string {
  const current = startOfWeek(now);
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return current;
  // addDays rolls "2026-02-31" over to March, so a round trip exposes it.
  if (addDays(value, 0) !== value) return current;
  const monday = startOfWeek(value);
  return monday > current ? current : monday;
}

export default async function WeeklyPage(props: PageProps<"/haftalik">) {
  const { w, cur } = await props.searchParams;
  const { locale, t } = await getT();

  const now = today();
  const weekStart = resolveWeek(w, now);
  const weekEnd = addDays(weekStart, 6);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  // proxy.ts already redirects signed-out visitors; this only narrows the type.
  if (!userId) return null;

  const digest = await getWeeklyDigest(supabase, userId, weekStart);

  const current = {} as Totals;
  const previous = {} as Totals;
  for (const c of CURRENCIES) {
    current[c] = digest.byCurrency[c].total;
    previous[c] = digest.byCurrency[c].prevTotal;
  }
  const currency = pickCurrency(cur, current, previous);
  const showTabs = CURRENCIES.every((c) => current[c] + previous[c] > 0);
  const data = digest.byCurrency[currency];

  // Dates are formatted here, on the server, and passed down as plain text.
  const range = `${formatDayMonth(weekStart, locale)} – ${formatDayMonth(weekEnd, locale)}`;

  const slices: DonutSlice[] = data.slices.map((s) => ({
    name: s.isOther ? t.weekly.other : translateCategory(s.name, t),
    value: s.amount,
    amount: formatMoney(s.amount, currency, t),
    pct: s.pct,
    isOther: s.isOther,
  }));

  // /api/insights only knows this week and last week; older weeks would be
  // summarised as the wrong period, so they get no AI block at all.
  const thisWeekStart = startOfWeek(now);
  const aiPeriod =
    weekStart === thisWeekStart
      ? "this_week"
      : weekStart === addDays(thisWeekStart, -7)
        ? "last_week"
        : null;

  const pct = data.changePct;
  const down = pct !== null && pct < 0;
  const flat = pct !== null && Math.round(pct) === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight">{t.weekly.title}</h1>
        <p className="text-sm text-ink-3">{range}</p>
      </div>

      <Card
        title={t.weekly.total}
        action={
          showTabs ? <CurrencyTabs active={currency} t={t} params={{ w: weekStart }} /> : undefined
        }
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <p className="tnum text-stat font-semibold">{formatMoney(data.total, currency, t)}</p>
          {pct === null ? (
            <span className="text-xs text-ink-3">{t.weekly.noBaseline}</span>
          ) : (
            <span
              className="tnum inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{
                // Arrow + signed number carry the meaning; colour is a bonus.
                borderColor: flat ? "var(--border)" : down ? "var(--good)" : "var(--warn)",
                background: flat
                  ? "transparent"
                  : `color-mix(in srgb, ${down ? "var(--good)" : "var(--warn)"} 14%, transparent)`,
              }}
            >
              <span aria-hidden>{flat ? "•" : down ? "▼" : "▲"}</span>
              {pct > 0 ? "+" : ""}
              {Math.round(pct)}% {t.weekly.vsLastWeek}
            </span>
          )}
        </div>
      </Card>

      <Card title={t.weekly.breakdown}>
        {slices.length === 0 ? (
          <EmptyState>{t.weekly.empty}</EmptyState>
        ) : (
          <WeeklyDonut slices={slices} ariaLabel={t.weekly.chartLabel(currency)} />
        )}
      </Card>

      {aiPeriod && (
        <Card title={t.weekly.aiTitle}>
          <AiSummary period={aiPeriod} />
        </Card>
      )}
    </div>
  );
}

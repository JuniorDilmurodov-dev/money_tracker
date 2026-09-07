"use client";

import { useEffect, useState } from "react";

import { Card, ErrorText } from "@/components/ui";
import { daysBetween, formatDayMonth, startOfMonth, startOfWeek, today } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/lib/i18n/config";
import { insightText } from "@/lib/insights";
import type { Insight, InsightPeriod } from "@/lib/types";

type Period = InsightPeriod;
type Generated = { text: string; lang: Locale };

const PERIODS: readonly Period[] = ["this_week", "last_week", "this_month", "last_month"];

/** A stored insight's period is "weekly" whether it's a new or legacy value. */
function isWeekly(period: string): boolean {
  return period === "week" || period === "this_week" || period === "last_week";
}

/**
 * Days of real data available in an in-progress period. Complete periods
 * (last week, last month) have nothing to warn about.
 */
function daysElapsed(period: Period): number {
  const now = today();
  if (period === "this_week") return daysBetween(startOfWeek(now), now) + 1;
  if (period === "this_month") return daysBetween(startOfMonth(now), now) + 1;
  return Infinity;
}

/**
 * Versioned: entries cached before insights became single-language have a
 * different shape, and reading them back would mislabel their language.
 */
const HISTORY_CACHE_KEY = "xarajat-insights-history-v3";
const MAX_CACHED = 20;

function anyText(item: Insight): string {
  return item.text_en ?? item.text_ru ?? item.text_uz ?? "";
}

/** Same generation, so it shouldn't show up twice once a DB row exists too. */
function dedupeKey(item: Insight): string {
  return `${item.period}|${item.period_start}|${item.lang ?? ""}|${anyText(item).slice(0, 60)}`;
}

function mergeHistory(a: Insight[], b: Insight[]): Insight[] {
  const seen = new Map<string, Insight>();
  for (const item of [...a, ...b]) seen.set(dedupeKey(item), item);
  return [...seen.values()]
    .sort((x, y) => y.created_at.localeCompare(x.created_at))
    .slice(0, MAX_CACHED);
}

function readCache(): Insight[] {
  try {
    const raw = localStorage.getItem(HISTORY_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Insight[]) : [];
  } catch {
    return [];
  }
}

function writeCache(history: Insight[]) {
  try {
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(history.slice(0, MAX_CACHED)));
  } catch {
    // Private mode — insights just won't survive a reload this session.
  }
}

/** Chips, shared by the period and language rows. */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  title,
  columns,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  render: (option: T) => string;
  title?: (option: T) => string;
  /** Defaults to one row of `options.length` columns; pass to wrap, e.g. 2x2. */
  columns?: number;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-xl border border-line bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          title={title?.(option)}
          onClick={() => onChange(option)}
          className={`h-10 rounded-lg text-sm font-medium transition-colors ${
            option === value ? "bg-surface-1 text-ink" : "text-ink-3"
          }`}
        >
          {render(option)}
        </button>
      ))}
    </div>
  );
}

/**
 * A stored insight only exists in the language it was generated in, so the
 * badge is not decoration — it's what tells you why an entry is in Russian
 * while you're reading the app in Uzbek.
 */
function LangBadge({ lang }: { lang: Locale }) {
  return (
    <span
      lang={lang}
      title={LOCALE_LABELS[lang]}
      className="rounded border border-line px-1 text-[10px] font-semibold tracking-wide text-ink-3"
    >
      {LOCALE_SHORT[lang]}
    </span>
  );
}

/**
 * Nothing is generated on page load — the API costs money per call, so it only
 * runs when the button is pressed. Past generations are saved server-side, so
 * they survive a reload instead of being re-billed.
 */
export function InsightsPanel({
  initialHistory,
  initialRemaining,
  limit,
}: {
  initialHistory: Insight[];
  initialRemaining: number;
  limit: number;
}) {
  const { locale, t } = useI18n();
  const [period, setPeriod] = useState<Period>("this_week");
  // Defaults to the language the app is in; the reader can override it without
  // changing the site language.
  const [lang, setLang] = useState<Locale>(locale);
  const [result, setResult] = useState<Generated | null>(null);
  const [generatedFor, setGeneratedFor] = useState<{ period: Period; lang: Locale } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [remaining, setRemaining] = useState(initialRemaining);

  // Reconcile with the browser-local cache after mount — this is what keeps a
  // generated insight from disappearing on reload while the `insights` table
  // migration hasn't been applied yet (the server list is empty until then).
  useEffect(() => {
    const cached = readCache();
    if (cached.length > 0) setHistory((prev) => mergeHistory(prev, cached));
  }, []);

  useEffect(() => {
    writeCache(history);
  }, [history]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period, lang }),
      });
      const data = await response.json();
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!response.ok) {
        setError(data.error ?? t.insights.failed);
        setResult(null);
        return;
      }
      const generated: Generated = { text: data.text, lang: data.lang ?? lang };
      setResult(generated);
      setGeneratedFor({ period, lang });
      // The "nothing logged yet" response has no period start — nothing
      // meaningful to save to history in that case. A cache hit is already
      // in history (that's what made it a hit), so adding it again would
      // just duplicate the entry.
      if (data.periodStart && !data.cached) {
        setHistory((prev) => [
          {
            id: `local-${Date.now()}`,
            period: data.period ?? period,
            period_start: data.periodStart,
            lang: generated.lang,
            text_en: generated.lang === "en" ? generated.text : null,
            text_ru: generated.lang === "ru" ? generated.text : null,
            text_uz: generated.lang === "uz" ? generated.text : null,
            created_at: data.generatedAt,
          },
          ...prev,
        ]);
      }
    } catch {
      setError(t.insights.unreachable);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const stale =
    result !== null &&
    (generatedFor?.period !== period || generatedFor?.lang !== lang);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-4">
          <ChipGroup
            label={t.insights.period}
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            columns={2}
            render={(value) => {
              switch (value) {
                case "this_week":
                  return t.insights.thisWeek;
                case "last_week":
                  return t.insights.lastWeek;
                case "this_month":
                  return t.insights.thisMonth;
                case "last_month":
                  return t.insights.lastMonth;
              }
            }}
          />

          <ChipGroup
            label={t.insights.language}
            options={LOCALES}
            value={lang}
            onChange={setLang}
            render={(value) => LOCALE_SHORT[value]}
            title={(value) => LOCALE_LABELS[value]}
          />

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={generate}
              disabled={loading || remaining === 0}
              className="h-12 rounded-xl bg-series-1 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? t.insights.generating : t.insights.generate}
            </button>
            <p className="text-xs text-ink-3" title={`${remaining}/${limit}`}>
              {t.insights.remaining(remaining)}
            </p>
            {remaining > 0 && daysElapsed(period) < 3 && (
              <p className="text-xs text-ink-3">{t.insights.fewDataHint}</p>
            )}
          </div>

          {error && (
            <div className="flex flex-col gap-2">
              <ErrorText>{error}</ErrorText>
              <button
                type="button"
                onClick={generate}
                disabled={loading || remaining === 0}
                className="self-start text-xs font-medium text-series-1 underline-offset-2 hover:underline disabled:opacity-60"
              >
                {t.insights.retry}
              </button>
            </div>
          )}

          {result && (
            <div aria-live="polite">
              {stale && <p className="mb-2 text-xs text-ink-3">{t.insights.stale}</p>}
              <p
                lang={result.lang}
                className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2"
              >
                {result.text}
              </p>
            </div>
          )}

          {!result && !error && !loading && (
            <p className="text-sm text-ink-3">{t.insights.nothingSent}</p>
          )}
        </div>
      </Card>

      {history.length > 0 && (
        <Card title={t.insights.past}>
          <ul className="flex flex-col divide-y divide-line">
            {history.map((item) => {
              const entry = insightText(item, locale);
              return (
                <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-3">
                    <span>
                      {isWeekly(item.period)
                        ? t.insights.weekOf(formatDayMonth(item.period_start, locale))
                        : t.insights.monthOf(formatDayMonth(item.period_start, locale))}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{new Date(item.created_at).toLocaleDateString(locale)}</span>
                    <LangBadge lang={entry.lang} />
                  </p>
                  <p
                    lang={entry.lang}
                    className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2"
                  >
                    {entry.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

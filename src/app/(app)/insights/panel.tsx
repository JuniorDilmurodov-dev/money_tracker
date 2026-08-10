"use client";

import { useEffect, useState } from "react";

import { Card, ErrorText } from "@/components/ui";
import { formatDayMonth } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/lib/i18n/config";
import { insightText } from "@/lib/insights";
import type { Insight } from "@/lib/types";

type Period = "week" | "month";
type Generated = { text: string; lang: Locale };

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

/** Three chips, shared by the period and language rows. */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  title,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  render: (option: T) => string;
  title?: (option: T) => string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-xl border border-line bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
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
export function InsightsPanel({ initialHistory }: { initialHistory: Insight[] }) {
  const { locale, t } = useI18n();
  const [period, setPeriod] = useState<Period>("week");
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
      if (!response.ok) {
        setError(data.error ?? t.insights.failed);
        setResult(null);
        return;
      }
      const generated: Generated = { text: data.text, lang: data.lang ?? lang };
      setResult(generated);
      setGeneratedFor({ period, lang });
      // The "nothing logged yet" response has no period start — nothing
      // meaningful to save to history in that case.
      if (data.periodStart) {
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
            options={["week", "month"] as const}
            value={period}
            onChange={setPeriod}
            render={(value) => (value === "week" ? t.insights.thisWeek : t.insights.thisMonth)}
          />

          <ChipGroup
            label={t.insights.language}
            options={LOCALES}
            value={lang}
            onChange={setLang}
            render={(value) => LOCALE_SHORT[value]}
            title={(value) => LOCALE_LABELS[value]}
          />

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="h-12 rounded-xl bg-series-1 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t.insights.generating : t.insights.generate}
          </button>

          {error && <ErrorText>{error}</ErrorText>}

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
                      {item.period === "week"
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

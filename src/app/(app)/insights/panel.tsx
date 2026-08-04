"use client";

import { useEffect, useState } from "react";

import { Card, ErrorText } from "@/components/ui";
import { formatDayMonth } from "@/lib/dates";
import type { Insight } from "@/lib/types";

type Period = "week" | "month";
type Bilingual = { en: string; uz: string };

const HISTORY_CACHE_KEY = "xarajat-insights-history";
const MAX_CACHED = 20;

/** Same generation, so it shouldn't show up twice once a DB row exists too. */
function dedupeKey(item: Insight): string {
  return `${item.period}|${item.period_start}|${item.text_en.slice(0, 60)}`;
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

function InsightText({ text }: { text: Bilingual }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1 text-xs font-medium tracking-wide text-ink-3">ENGLISH</p>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{text.en}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium tracking-wide text-ink-3">O&apos;ZBEKCHA</p>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{text.uz}</p>
      </div>
    </div>
  );
}

/**
 * Nothing is generated on page load — the API costs money per call, so it only
 * runs when the button is pressed. Past generations are saved server-side, so
 * they survive a reload instead of being re-billed.
 */
export function InsightsPanel({ initialHistory }: { initialHistory: Insight[] }) {
  const [period, setPeriod] = useState<Period>("week");
  const [text, setText] = useState<Bilingual | null>(null);
  const [generatedFor, setGeneratedFor] = useState<Period | null>(null);
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
        body: JSON.stringify({ period }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not generate insights.");
        setText(null);
        return;
      }
      const result: Bilingual = { en: data.en, uz: data.uz };
      setText(result);
      setGeneratedFor(period);
      // The "nothing logged yet" response has no period start — nothing
      // meaningful to save to history in that case.
      if (data.periodStart) {
        setHistory((prev) => [
          {
            id: `local-${Date.now()}`,
            period: data.period ?? period,
            period_start: data.periodStart,
            text_en: result.en,
            text_uz: result.uz,
            created_at: data.generatedAt,
          },
          ...prev,
        ]);
      }
    } catch {
      setError("Could not reach the server.");
      setText(null);
    } finally {
      setLoading(false);
    }
  }

  const stale = text !== null && generatedFor !== period;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-4">
          <div
            role="group"
            aria-label="Period"
            className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1"
          >
            {(["week", "month"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  period === value ? "bg-surface-1 text-ink" : "text-ink-3"
                }`}
              >
                {value === "week" ? "This week" : "This month"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="h-12 rounded-xl bg-series-1 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Reading your spending…" : "Generate insights"}
          </button>

          {error && <ErrorText>{error}</ErrorText>}

          {text && (
            <div aria-live="polite">
              {stale && (
                <p className="mb-2 text-xs text-ink-3">
                  Showing the {generatedFor === "week" ? "weekly" : "monthly"} summary —
                  press generate again for the {period === "week" ? "week" : "month"}.
                </p>
              )}
              <InsightText text={text} />
            </div>
          )}

          {!text && !error && !loading && (
            <p className="text-sm text-ink-3">
              Nothing is sent to the AI until you press the button.
            </p>
          )}
        </div>
      </Card>

      {history.length > 0 && (
        <Card title="Past insights">
          <ul className="flex flex-col divide-y divide-line">
            {history.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <p className="mb-2 text-xs text-ink-3">
                  {item.period === "week" ? "Week" : "Month"} of{" "}
                  {formatDayMonth(item.period_start)} ·{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
                <InsightText text={{ en: item.text_en, uz: item.text_uz }} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

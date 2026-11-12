"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

/**
 * Calls the existing POST /api/insights, so its caching and daily quota apply
 * unchanged. Nothing date-shaped is formatted here: the page passes the period
 * in already, and the response text is shown as-is, which keeps server and
 * client markup identical on first paint.
 */
export function AiSummary({ period }: { period: "this_week" | "last_week" }) {
  const { locale, t } = useI18n();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, lang: locale }),
      });
      const data = await response.json().catch(() => ({}));
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!response.ok || typeof data.text !== "string") {
        setError(typeof data.error === "string" ? data.error : t.weekly.aiFailed);
        return;
      }
      setText(data.text);
    } catch {
      setError(t.weekly.aiFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {text && <p className="text-sm leading-relaxed text-pretty text-ink-2">{text}</p>}
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="h-10 rounded-lg border border-line bg-surface-2 px-4 text-sm font-medium text-ink disabled:opacity-60"
        >
          {loading ? t.weekly.aiGenerating : t.weekly.aiGenerate}
        </button>
        {remaining !== null && (
          <span className="text-xs text-ink-3">{t.weekly.aiRemaining(remaining)}</span>
        )}
      </div>
    </div>
  );
}

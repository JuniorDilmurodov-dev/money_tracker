"use client";

import { useState } from "react";

import { Card, ErrorText } from "@/components/ui";

type Period = "week" | "month";

/**
 * Nothing is generated on page load — the API costs money per call, so it only
 * runs when the button is pressed.
 */
export function InsightsPanel() {
  const [period, setPeriod] = useState<Period>("week");
  const [text, setText] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<Period | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setText(data.text);
      setGeneratedFor(period);
    } catch {
      setError("Could not reach the server.");
      setText(null);
    } finally {
      setLoading(false);
    }
  }

  const stale = text !== null && generatedFor !== period;

  return (
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
          className="h-12 rounded-xl bg-series-1 text-base font-semibold text-white transition-opacity disabled:opacity-60"
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
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">
              {text}
            </p>
          </div>
        )}

        {!text && !error && !loading && (
          <p className="text-sm text-ink-3">
            Nothing is sent to the AI until you press the button.
          </p>
        )}
      </div>
    </Card>
  );
}

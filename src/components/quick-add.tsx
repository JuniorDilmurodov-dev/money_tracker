"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

import { addExpense } from "@/app/actions";
import { ErrorText } from "@/components/ui";
import { today as todayISO, addDays } from "@/lib/dates";
import type { ActionResult, Category } from "@/lib/types";

const LAST_CATEGORY_KEY = "last-category";

// The last-used category is browser state, not React state — read it from
// localStorage through a store so hydration stays consistent.
const listeners = new Set<() => void>();
let cachedLastCategory: string | null | undefined;

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getLastCategory(): string | null {
  if (cachedLastCategory === undefined) {
    try {
      cachedLastCategory = localStorage.getItem(LAST_CATEGORY_KEY);
    } catch {
      cachedLastCategory = null;
    }
  }
  return cachedLastCategory;
}

function setLastCategory(name: string) {
  cachedLastCategory = name;
  try {
    localStorage.setItem(LAST_CATEGORY_KEY, name);
  } catch {
    // Private mode — the choice just won't survive a reload.
  }
  for (const listener of listeners) listener();
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-2xl bg-series-1 text-base font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save expense"}
    </button>
  );
}

/**
 * Optimised for one thing: logging an expense in under ten seconds.
 * Amount is focused on load, categories are one-tap chips (no dropdown), the
 * date is already today, and the note stays collapsed until asked for.
 */
export function QuickAdd({ categories }: { categories: Category[] }) {
  const today = todayISO();
  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const remembered = useSyncExternalStore(subscribe, getLastCategory, () => null);
  const fallback = categories[0]?.name ?? "Other";
  const [picked, setPicked] = useState<string | null>(null);

  // Explicit tap wins; otherwise reopen on the category used last time.
  const category =
    picked ??
    (remembered && categories.some((c) => c.name === remembered) ? remembered : fallback);

  const [date, setDate] = useState(today);
  const [showNote, setShowNote] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saved, setSaved] = useState(false);

  /**
   * Wraps the Server Action so the post-save reset happens in the action, not
   * in an effect reacting to it. Keeps the category and date for the next
   * entry and hands focus back to the amount.
   */
  async function handleSubmit(formData: FormData) {
    const outcome = await addExpense(null, formData);
    setResult(outcome);
    if (!outcome.ok) return;

    formRef.current?.reset();
    setShowNote(false);
    amountRef.current?.focus();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  function pickCategory(name: string) {
    setPicked(name);
    setLastCategory(name);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="amount" className="sr-only">
          Amount in so&apos;m
        </label>
        <div className="flex items-baseline gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 focus-within:border-line-strong">
          <input
            id="amount"
            ref={amountRef}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0"
            required
            className="tnum w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight outline-none placeholder:text-ink-3"
          />
          <span className="shrink-0 text-base text-ink-3">so&apos;m</span>
        </div>
      </div>

      <fieldset>
        <legend className="sr-only">Category</legend>
        <input type="hidden" name="category" value={category} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((c) => {
            const active = c.name === category;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => pickCategory(c.name)}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-transparent bg-series-1 text-white"
                    : "border-line bg-surface-2 text-ink-2"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="spent_on" value={date} />
        {[
          { label: "Today", value: today },
          { label: "Yesterday", value: addDays(today, -1) },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={date === option.value}
            onClick={() => setDate(option.value)}
            className={`h-10 rounded-full border px-4 text-sm transition-colors ${
              date === option.value
                ? "border-line-strong bg-surface-2 text-ink"
                : "border-line text-ink-3"
            }`}
          >
            {option.label}
          </button>
        ))}
        <label className="flex items-center gap-2">
          <span className="sr-only">Pick a date</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-10 rounded-full border border-line bg-surface-2 px-3 text-sm text-ink-2 outline-none focus:border-line-strong"
          />
        </label>

        {!showNote && (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="h-10 rounded-full border border-line px-4 text-sm text-ink-3"
          >
            + Note
          </button>
        )}
      </div>

      {showNote && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">Note (optional)</span>
          <input
            name="note"
            maxLength={280}
            autoFocus
            className="h-12 rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
          />
        </label>
      )}

      {result && !result.ok && <ErrorText>{result.error}</ErrorText>}

      <SaveButton />

      <p aria-live="polite" className="min-h-5 text-center text-sm text-ink-3">
        {saved ? "Saved ✓" : ""}
      </p>
    </form>
  );
}

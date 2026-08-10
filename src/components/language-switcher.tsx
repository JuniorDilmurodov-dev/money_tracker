"use client";

import { useTransition } from "react";

import { setLocale } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n/config";

/**
 * Three chips rather than a dropdown: with only three languages a select costs
 * two taps and hides the current choice behind a closed control.
 *
 * The action writes the cookie and revalidates, so the switch is a normal
 * server round trip — no client-side dictionary swap to keep in sync.
 */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.header.language}
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface-2 p-0.5"
    >
      {LOCALES.map((value) => {
        const active = value === locale;
        return (
          <button
            key={value}
            type="button"
            lang={value}
            disabled={pending}
            aria-pressed={active}
            title={LOCALE_LABELS[value]}
            onClick={() => startTransition(() => setLocale(value))}
            className={`h-8 rounded-full px-2 text-[11px] font-semibold tracking-wide transition-colors disabled:opacity-60 ${
              active ? "bg-surface-1 text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {LOCALE_SHORT[value]}
          </button>
        );
      })}
    </div>
  );
}

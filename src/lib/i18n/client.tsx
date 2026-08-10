"use client";

import { createContext, useContext, type ReactNode } from "react";

import { getDictionary } from "./index";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

/**
 * The locale is resolved on the server and handed down, so client components
 * render the same language on the first paint as the server did — no flash of
 * the wrong language and no hydration mismatch.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Dictionary {
  return getDictionary(useContext(LocaleContext));
}

/** Both at once, for components that format money or dates as well as text. */
export function useI18n(): { locale: Locale; t: Dictionary } {
  const locale = useContext(LocaleContext);
  return { locale, t: getDictionary(locale) };
}

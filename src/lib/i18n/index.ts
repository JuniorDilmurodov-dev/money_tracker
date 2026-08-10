import { en, type Dictionary } from "./dictionaries/en";
import { ru } from "./dictionaries/ru";
import { uz } from "./dictionaries/uz";
import { INTL_LOCALE, type Locale } from "./config";

export type { Dictionary };
export * from "./config";

/**
 * All three dictionaries are imported statically rather than lazily. They are a
 * few kilobytes each, and client components need whichever one is active
 * anyway — a dynamic import would only buy a loading state nobody wants
 * mid-render.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, uz };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

import { LOCALES, type Locale } from "@/lib/i18n/config";
import type { Insight } from "@/lib/types";

const COLUMN: Record<Locale, keyof Pick<Insight, "text_en" | "text_ru" | "text_uz">> = {
  en: "text_en",
  ru: "text_ru",
  uz: "text_uz",
};

/**
 * The text to show for a stored insight, and the language it turned out to be
 * in — which is not always the language the reader is browsing in.
 *
 * A row generated after the language picker landed carries exactly one
 * language and is shown in it, whatever the site is set to; re-rendering it in
 * another language would mean paying for another generation. Older rows hold
 * English and Uzbek together, so those get whichever of the two the reader
 * asked for.
 */
export function insightText(
  insight: Insight,
  reader: Locale,
): { text: string; lang: Locale } {
  if (insight.lang) {
    const own = insight[COLUMN[insight.lang]];
    if (own) return { text: own, lang: insight.lang };
  }

  // Legacy row, or a `lang` whose column somehow came back empty: take the
  // reader's language if it's there, then anything that is.
  for (const locale of [reader, ...LOCALES]) {
    const text = insight[COLUMN[locale]];
    if (text) return { text, lang: locale };
  }

  return { text: "", lang: reader };
}

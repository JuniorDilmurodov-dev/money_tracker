/**
 * The app is not locale-routed — `/week` stays `/week` in every language and
 * the choice rides in a cookie instead. Everything here is safe to import from
 * both the server and the client (proxy.ts included), so it holds no
 * dictionaries and touches no Next APIs.
 */
export const LOCALES = ["uz", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Used when the cookie is missing and `Accept-Language` matches nothing. */
export const DEFAULT_LOCALE: Locale = "uz";

export const LOCALE_COOKIE = "locale";

/** A year — the choice is a preference, not session state. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

/** Short form for the header switcher, where there's room for three chips. */
export const LOCALE_SHORT: Record<Locale, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

/** BCP 47 tags for Intl — "uz" alone resolves to the Latin script we want. */
export const INTL_LOCALE: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-GB",
};

/**
 * Best match for an `Accept-Language` header, by quality order.
 * Only the primary subtag is compared, so `ru-RU`, `ru` and `ru-BY` all hit
 * Russian, and `uz-Latn-UZ` hits Uzbek.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number(q);
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}

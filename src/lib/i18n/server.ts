import { cookies, headers } from "next/headers";

import { getDictionary } from "./index";
import {
  isLocale,
  localeFromAcceptLanguage,
  LOCALE_COOKIE,
  type Locale,
} from "./config";
import type { Dictionary } from "./dictionaries/en";

/**
 * The active locale for this request: the cookie proxy.ts wrote, or — on the
 * very first request, before that cookie exists — whatever `Accept-Language`
 * asks for.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerList = await headers();
  return localeFromAcceptLanguage(headerList.get("accept-language"));
}

/** Locale plus its dictionary, which is what callers almost always want. */
export async function getT(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

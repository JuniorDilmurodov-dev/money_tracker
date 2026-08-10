"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import enGB from "antd/locale/en_GB";
import ruRU from "antd/locale/ru_RU";
import uzUZ from "antd/locale/uz_UZ";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/ru";
import "dayjs/locale/uz-latn";
import { useSyncExternalStore, type ReactNode } from "react";

import { getThemeServerSnapshot, getThemeSnapshot, subscribeTheme } from "@/lib/theme-store";
import { LocaleProvider } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

/**
 * antd ships its own strings ("Today", the Ok/Cancel buttons), while the month
 * and weekday names inside the DatePicker panel come from dayjs. Both have to
 * be switched or the picker ends up half-translated.
 */
const ANTD_LOCALES = { en: enGB, ru: ruRU, uz: uzUZ };
const DAYJS_LOCALES: Record<Locale, string> = {
  en: "en-gb",
  ru: "ru",
  uz: "uz-latn",
};

/** Maps our CSS custom properties onto antd's design tokens, so its
 * components (the DatePicker, mainly) sit on the same surfaces and accent
 * color as the rest of the app instead of looking like a foreign widget. */
export function AntdProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  // dayjs keeps the active locale in a module global rather than in context,
  // so it has to be set on both the server pass and the client one.
  dayjs.locale(DAYJS_LOCALES[locale]);

  return (
    <LocaleProvider locale={locale}>
      <ConfigProvider
        locale={ANTD_LOCALES[locale]}
        theme={{
          algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: "#a16207",
            colorBgBase: theme === "dark" ? "#222225" : "#fcfcfb",
            // surface-2, the same raised fill the app's own inputs sit on —
            // without it the DatePicker is the one field on a card with no fill.
            colorBgContainer: theme === "dark" ? "#2c2c30" : "#f0efec",
            colorBorder: theme === "dark" ? "#3c3c41" : "#dedcd5",
            borderRadius: 10,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </LocaleProvider>
  );
}

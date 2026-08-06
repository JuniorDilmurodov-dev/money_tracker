"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import { useSyncExternalStore, type ReactNode } from "react";

import { getThemeServerSnapshot, getThemeSnapshot, subscribeTheme } from "@/lib/theme-store";

/** Maps our CSS custom properties onto antd's design tokens, so its
 * components (the DatePicker, mainly) sit on the same surfaces and accent
 * color as the rest of the app instead of looking like a foreign widget. */
export function AntdProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  return (
    <ConfigProvider
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
  );
}

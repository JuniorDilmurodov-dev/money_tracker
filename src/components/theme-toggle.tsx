"use client";

import { useSyncExternalStore } from "react";

import { getThemeServerSnapshot, getThemeSnapshot, setTheme, subscribeTheme } from "@/lib/theme-store";
import { useT } from "@/lib/i18n/client";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const t = useT();

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? t.header.toLight : t.header.toDark}
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-2 text-ink-2 transition-colors hover:text-ink"
    >
      <span aria-hidden className="text-sm">
        {theme === "dark" ? "☾" : "☀"}
      </span>
    </button>
  );
}

/**
 * The theme lives on <html data-theme>, written before first paint by the
 * inline script in the root layout. Everything else subscribes to that
 * external value rather than mirroring it into React state.
 */
export type Theme = "dark" | "light";

const listeners = new Set<() => void>();

export function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getThemeSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function getThemeServerSnapshot(): Theme {
  return "dark";
}

export function setTheme(next: Theme) {
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private mode — the theme still applies for this session.
  }
  if (next === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  for (const listener of listeners) listener();
}

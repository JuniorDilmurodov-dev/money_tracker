"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getInstallServerSnapshot,
  getInstallSnapshot,
  isIOS,
  promptInstall,
  subscribeInstall,
} from "@/lib/install-store";
import { useT } from "@/lib/i18n/client";

/**
 * Registers the service worker. Rendered once from the root layout, including
 * on `/login` — the worker's job is a fast cold launch, and the login screen is
 * the first thing a new install paints.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Registering during load competes with the page's own requests for the
    // first paint; the worker is only needed on the *next* launch anyway.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // A blocked or unsupported worker costs nothing here — the app is
          // fully functional without it.
        });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

/** A store that never changes: `false` on the server, `true` once hydrated. */
const noopSubscribe = () => () => {};

/**
 * The platform checks below can only run in the browser — the server has no
 * idea whether it is rendering for iOS or for a window that is already
 * standalone. Gating on hydration through `useSyncExternalStore` rather than
 * an effect keeps the first client render matching the server's.
 */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function useInstallState() {
  return useSyncExternalStore(
    subscribeInstall,
    getInstallSnapshot,
    getInstallServerSnapshot,
  );
}

/**
 * The Settings entry. Unlike the banner this always says something, because a
 * user who went looking for "install" deserves an answer even where the browser
 * gives us no button to offer — iOS especially.
 */
export function InstallCard() {
  const t = useT();
  const state = useInstallState();
  const mounted = useMounted();

  if (!mounted) return null;

  if (state === "installed") {
    return <p className="text-sm text-ink-2">{t.pwa.installed}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-pretty text-ink-2">{t.pwa.description}</p>
      {state === "available" ? (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="h-11 self-start rounded-xl bg-series-1 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t.pwa.installButton}
        </button>
      ) : (
        <p className="text-sm text-pretty text-ink-3">
          {isIOS() ? t.pwa.iosHint : t.pwa.unavailable}
        </p>
      )}
    </div>
  );
}

/**
 * Dismissal lives in `localStorage` rather than React state so it survives a
 * reload, and is read through a store for the same reason the install state is:
 * the server can't see it, and the first client render must not disagree with
 * the server's.
 */
const DISMISSED_KEY = "install-dismissed";
const dismissListeners = new Set<() => void>();

/** Stands in for `localStorage` where writing to it throws — private mode. */
let dismissedThisSession = false;

function subscribeDismissed(callback: () => void) {
  dismissListeners.add(callback);
  return () => dismissListeners.delete(callback);
}

function getDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return dismissedThisSession;
  }
}

function dismissBanner() {
  dismissedThisSession = true;
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Private mode — the flag above still hides it until the tab closes.
  }
  for (const listener of dismissListeners) listener();
}

/**
 * A one-line offer above the app content, shown only when there is a real
 * prompt to fire. Dismissal is permanent — Settings keeps the offer for anyone
 * who changes their mind, and a banner that comes back is worse than no banner.
 */
export function InstallBanner() {
  const t = useT();
  const state = useInstallState();
  const mounted = useMounted();
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissed,
    () => true,
  );

  if (!mounted || dismissed || state !== "available") return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface-1 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t.pwa.bannerTitle}</p>
        <p className="text-xs text-pretty text-ink-3">{t.pwa.bannerBody}</p>
      </div>
      <button
        type="button"
        onClick={dismissBanner}
        className="h-9 rounded-lg px-3 text-sm text-ink-3 transition-colors hover:text-ink-2"
      >
        {t.pwa.dismiss}
      </button>
      <button
        type="button"
        onClick={() => void promptInstall()}
        className="h-9 rounded-lg bg-series-1 px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t.pwa.installButton}
      </button>
    </div>
  );
}

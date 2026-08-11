"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { subscribePush, unsubscribePush } from "@/app/actions";
import { ErrorText } from "@/components/ui";
import { isIOS, isStandalone } from "@/lib/install-store";
import {
  getExistingSubscription,
  getPermission,
  isPushSupported,
  vapidKeyToUint8Array,
  type PushSubscriptionJSON,
} from "@/lib/notify-store";
import { useT } from "@/lib/i18n/client";

/** See install-store.ts's useMounted — same reason: the server can't know
 * platform or permission state, so the first client render has to match it. */
const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type Status = "loading" | "unsupported" | "ios-not-installed" | "denied" | "off" | "subscribed";

/** The Settings entry for the daily reminder. */
export function NotificationCard() {
  const t = useT();
  const mounted = useMounted();
  const [status, setStatus] = useState<Status>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    (async () => {
      if (!isPushSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      // iOS can only ask for notification permission once installed to the
      // home screen — asking from a browser tab silently does nothing.
      if (isIOS() && !isStandalone()) {
        if (!cancelled) setStatus("ios-not-installed");
        return;
      }
      if (getPermission() === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }

      const existing = await getExistingSubscription();
      if (cancelled) return;
      if (existing) {
        setEndpoint(existing.endpoint);
        setStatus("subscribed");
      } else {
        setStatus("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  async function enable() {
    setBusy(true);
    setError(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push notifications are not configured.");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyToUint8Array(publicKey),
      });
      const json = subscription.toJSON() as PushSubscriptionJSON;

      const result = await subscribePush(json);
      if (!result.ok) throw new Error(result.error);

      setEndpoint(json.endpoint);
      setStatus("subscribed");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(false);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      if (endpoint) await unsubscribePush(endpoint);
      setEndpoint(null);
      setStatus("off");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || status === "loading" || status === "unsupported") return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-pretty text-ink-2">{t.notifications.description}</p>

      {status === "ios-not-installed" && (
        <p className="text-sm text-pretty text-ink-3">{t.notifications.iosHint}</p>
      )}

      {status === "denied" && (
        <p className="text-sm text-pretty text-ink-3">{t.notifications.deniedHint}</p>
      )}

      {status === "off" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void enable()}
          className="h-11 self-start rounded-xl bg-series-1 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {t.notifications.enableButton}
        </button>
      )}

      {status === "subscribed" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-2">{t.notifications.enabled}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disable()}
            className="h-9 rounded-lg border border-line px-3 text-sm text-ink-2 transition-colors hover:text-ink disabled:opacity-60"
          >
            {t.notifications.disableButton}
          </button>
        </div>
      )}

      {error && <ErrorText>{t.notifications.failed}</ErrorText>}
    </div>
  );
}

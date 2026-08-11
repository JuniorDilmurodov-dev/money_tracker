/**
 * Push notification permission state, read the same way install-store.ts
 * reads install state: a plain module-level store polled through
 * useSyncExternalStore, since `Notification.permission` has no change event
 * of its own to subscribe to — components re-check it after their own
 * request/subscribe calls instead of being pushed an update.
 */
export type PermissionState = "unsupported" | "default" | "denied" | "granted";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getPermission(): PermissionState {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

/**
 * `pushManager.subscribe()` wants the VAPID public key as a raw Uint8Array,
 * not the base64url string it's issued as.
 */
export function vapidKeyToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** The subscription for this browser installation, or null if there isn't one. */
export async function getExistingSubscription(): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? (subscription.toJSON() as PushSubscriptionJSON) : null;
}

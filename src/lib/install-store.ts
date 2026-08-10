/**
 * Chrome fires `beforeinstallprompt` once, early, and only ever hands out that
 * one event — whoever misses it cannot ask again. So the listener is attached
 * when this module is evaluated rather than inside a component's effect, and
 * the event is parked here for any component that mounts later.
 *
 * Safari has no equivalent: on iOS the user installs by hand from the Share
 * sheet, which is why `isIOS()` exists and why the UI never promises a button
 * it can't deliver.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** `available` means we hold a prompt we can fire on a user gesture. */
export type InstallState = "unavailable" | "available" | "installed";

const listeners = new Set<() => void>();
let deferred: BeforeInstallPromptEvent | null = null;

function emit() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Suppressing the default keeps Chrome's own mini-infobar out of the way so
    // the in-app card is the only place the offer appears.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function subscribeInstall(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getInstallSnapshot(): InstallState {
  if (isStandalone()) return "installed";
  return deferred ? "available" : "unavailable";
}

export function getInstallServerSnapshot(): InstallState {
  return "unavailable";
}

/**
 * Must be called from a user gesture — Chrome rejects a prompt raised on its
 * own. Resolves to whether the user accepted.
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;

  const event = deferred;
  // The event is single-use whatever the user picks; dropping it now stops a
  // second click from calling into a spent prompt.
  deferred = null;
  emit();

  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

/** True once the app is running from the home screen rather than in a tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS predates the display-mode media query and still reports this instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

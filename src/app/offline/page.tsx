import { getT } from "@/lib/i18n/server";

/**
 * The service worker's fallback for a navigation it can't complete. It is
 * precached at install time, so it must not depend on anything fetched later —
 * no data, no client JavaScript. "Try again" is a plain link: following it
 * re-attempts the network, and if that still fails the worker simply serves
 * this page again.
 *
 * Not gated by auth in `proxy.ts`: an offline device can't refresh a session,
 * and redirecting to a login page that also can't load helps nobody.
 */
export default async function OfflinePage() {
  const { t } = await getT();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-title font-semibold tracking-tight">{t.pwa.offlineTitle}</h1>
      <p className="text-sm text-pretty text-ink-2">{t.pwa.offlineBody}</p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
          A full page load, not a client transition: this page is reached with
          the network down, and `<Link>` would try to fetch an RSC payload that
          cannot arrive. */}
      <a
        href="/"
        className="flex h-11 items-center rounded-xl border border-line px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
      >
        {t.pwa.retry}
      </a>
    </main>
  );
}

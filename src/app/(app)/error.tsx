"use client";

import { useEffect } from "react";

import { useT } from "@/lib/i18n/client";

/**
 * Transient Supabase failures — a token minted a fraction of a second ahead of
 * the verifying node ("JWT issued at future"), a dropped connection — should
 * cost you a retry, not the whole screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const isAuthHiccup = /jwt|token|session/i.test(error.message);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-ink-2">
        {isAuthHiccup ? t.error.sessionHiccup : t.error.generic}
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-xl bg-series-1 px-5 text-sm font-semibold text-white"
      >
        {t.error.tryAgain}
      </button>
      <p className="max-w-xs text-xs text-ink-3">
        {isAuthHiccup ? t.error.hiccupHint : t.error.dataSafe}
      </p>
    </div>
  );
}

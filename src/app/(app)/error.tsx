"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isAuthHiccup = /jwt|token|session/i.test(error.message);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-ink-2">
        {isAuthHiccup
          ? "Your session hiccuped while loading this page."
          : "Something went wrong loading this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-xl bg-series-1 px-5 text-sm font-semibold text-white"
      >
        Try again
      </button>
      <p className="max-w-xs text-xs text-ink-3">
        {isAuthHiccup
          ? "This usually clears on its own. If it keeps happening, sign out and back in."
          : "Your data is safe — nothing was lost."}
      </p>
    </div>
  );
}

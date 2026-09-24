"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";

import { signIn, signUp } from "@/app/actions";
import { ErrorText } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/types";

type Mode = "signin" | "signup";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-series-1 text-base font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

/**
 * Keyed by mode from the parent, so switching tabs remounts this component and
 * `useActionState` resets. Keying only the <form> would clear the inputs but
 * leave the previous result on screen — which reads as a stale error.
 */
function ModeForm({ mode }: { mode: Mode }) {
  const t = useT();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    mode === "signin" ? signIn : signUp,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">{t.login.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">{t.login.password}</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          className="h-12 rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
        />
      </label>

      {state && !state.ok && <ErrorText>{state.error}</ErrorText>}
      {state?.ok && state.message && (
        <p aria-live="polite" className="text-sm text-ink-2">
          {state.message}
        </p>
      )}

      <div className="mt-2">
        <SubmitButton
          label={mode === "signin" ? t.login.signIn : t.login.createAccount}
        />
      </div>
    </form>
  );
}

export function LoginForm() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");

  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={t.login.account}
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1"
      >
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`h-9 rounded-lg text-sm font-medium transition-colors ${
              mode === value ? "bg-surface-1 text-ink" : "text-ink-3"
            }`}
          >
            {value === "signin" ? t.login.signIn : t.login.createAccount}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface-1 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.68-.06-1.35-.17-1.98H12v3.75h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.14Z"
            />
            <path
              fill="#34A853"
              d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.75Z"
            />
            <path
              fill="#FBBC05"
              d="M6.54 13.85A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.85V7.63H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.37l3.24-2.52Z"
            />
            <path
              fill="#EA4335"
              d="M12 6.12c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.2 14.63 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.63l3.24 2.52c.77-2.31 2.92-4.03 5.46-4.03Z"
            />
          </svg>
          Continue with Google
        </button>
      </div>

      <ModeForm key={mode} mode={mode} />
    </div>
  );
}

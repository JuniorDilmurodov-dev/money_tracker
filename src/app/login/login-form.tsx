"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

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
        <SubmitButton label={mode === "signin" ? t.login.signIn : t.login.createAccount} />
      </div>
    </form>
  );
}

export function LoginForm() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");

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

      <ModeForm key={mode} mode={mode} />
    </div>
  );
}

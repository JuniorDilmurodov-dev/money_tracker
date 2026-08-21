import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Where the links in Supabase's auth emails land.
 *
 * Nothing served this path before. That did not block confirmation — the stock
 * `{{ .ConfirmationURL }}` link points at Supabase's own `/auth/v1/verify`,
 * which marks the account confirmed before it redirects anywhere — but the
 * redirect then landed on the bare Site URL, where the app has no session to
 * read. The proxy bounced the reader to `/login` and made them type the
 * password they had just set, which reads exactly like a link that didn't work.
 *
 * With this route as the destination, clicking the link signs you in.
 *
 * Two link shapes are accepted, because the email template decides which one
 * arrives:
 *
 * - `?token_hash=…&type=…` — from a template built on `{{ .TokenHash }}`.
 *   Preferred: the app performs the verification itself, so it holds the
 *   session at the end of it.
 * - `?code=…` — what `{{ .ConfirmationURL }}` redirects with once
 *   `emailRedirectTo` points here. PKCE, so this one only completes in the
 *   browser that signed up: the `code_verifier` cookie lives there and nowhere
 *   else.
 */

const OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

type OtpType = (typeof OTP_TYPES)[number];

function isOtpType(value: string | null): value is OtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Only ever redirect within this app. `next` arrives from a URL that anyone
 * can hand-craft, so an absolute one would turn this route into an open
 * redirect — and a convincing one, since it sits behind a real login.
 */
function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  const supabase = await createClient();

  // `redirect()` reports itself by throwing, so the outcome is recorded first
  // and acted on after every await — inside a branch it would read as a crash.
  let failure: "expired" | "invalid" | null = null;

  if (tokenHash && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) failure = "expired";
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failure = "expired";
  } else {
    failure = "invalid";
  }

  if (failure) redirect(`/login?error=${failure}`);

  // Verification wrote the session cookies through `cookies().set()`, and the
  // redirect response carries them — so the proxy sees a signed-in user here.
  redirect(safeNext(params.get("next")));
}

"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/money";
import { today } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { CURRENCIES, type ActionResult, type Currency } from "@/lib/types";
import { parseAmountFor } from "@/lib/currency";

/**
 * Server Actions are reachable by direct POST, not just through the UI, so each
 * one re-checks auth. RLS is the real boundary — this is the friendly error.
 */
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, user: { id: userId } };
}

function refreshApp() {
  revalidatePath("/", "layout");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

/**
 * Writing the cookie from a Server Action rather than from the browser keeps
 * the switch atomic with the re-render: the RSC payload that comes back is
 * already in the new language, so nothing flashes.
 */
export async function setLocale(next: string): Promise<void> {
  if (!isLocale(next)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  refreshApp();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Where the confirmation email should send the reader back to.
 *
 * Read off the request rather than an env var so a preview deployment and
 * `localhost` each confirm against themselves, instead of mailing everyone a
 * link into production. Server Action POSTs always carry `Origin` — Next
 * rejects them otherwise — but if it is ever missing, returning undefined
 * lets Supabase fall back to the project's Site URL rather than building a
 * broken link. The origin has to be in Supabase's Redirect URLs allow-list
 * (README §5) or Supabase falls back to Site URL anyway.
 */
async function confirmRedirectUrl(): Promise<string | undefined> {
  const origin = (await headers()).get("origin");
  return origin ? `${origin}/auth/confirm` : undefined;
}

/**
 * Supabase answers in English no matter which language the reader picked, and
 * some of its wording explains nothing to the person reading it — "email rate
 * limit exceeded" is a fact about the mail quota, not an instruction. Only the
 * codes a signed-out reader can actually provoke are mapped; anything else
 * falls through to Supabase's own text, which beats a blank box.
 */
function authError(error: { code?: string; message: string }, t: Dictionary): string {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return t.actions.authEmailRateLimited;
    case "email_address_not_authorized":
      return t.actions.authEmailNotAuthorized;
    case "over_request_rate_limit":
      return t.actions.authTooManyRequests;
    case "email_not_confirmed":
      return t.actions.authEmailNotConfirmed;
    case "invalid_credentials":
      return t.actions.authInvalidCredentials;
    case "user_already_exists":
    case "email_exists":
      return t.actions.authEmailExists;
    case "weak_password":
      return t.actions.authWeakPassword;
    case "signup_disabled":
      return t.actions.authSignupDisabled;
    default:
      return error.message;
  }
}

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { t } = await getT();
  if (!email || !password) return { ok: false, error: t.actions.credentialsRequired };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: authError(error, t) };

  refreshApp();
  redirect("/");
}

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { t } = await getT();
  if (!email || !password) return { ok: false, error: t.actions.credentialsRequired };
  if (password.length < 8) {
    return { ok: false, error: t.actions.passwordTooShort };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await confirmRedirectUrl() },
  });
  if (error) return { ok: false, error: authError(error, t) };

  // With email confirmation on, there's no session yet. That isn't a failure —
  // return it as a notice so the UI doesn't render it as an error.
  if (!data.session) {
    return {
      ok: true,
      message: t.actions.confirmEmail,
    };
  }

  refreshApp();
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  refreshApp();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/** Anything but a known currency falls back to UZS. */
function readCurrency(formData: FormData): Currency {
  const raw = String(formData.get("currency") ?? "");
  return (CURRENCIES as readonly string[]).includes(raw) ? (raw as Currency) : "UZS";
}

export async function addExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { t } = await getT();

  const currency = readCurrency(formData);
  const amount = parseAmountFor(String(formData.get("amount") ?? ""), currency);
  if (amount === null) return { ok: false, error: t.actions.amountRequired };

  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { ok: false, error: t.actions.categoryRequired };

  const spentOn = String(formData.get("spent_on") ?? "").trim() || today();
  if (!ISO_DATE.test(spentOn)) return { ok: false, error: t.actions.invalidDate };

  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;

  const { error } = await supabase
    .from("expenses")
    .insert({ user_id: user.id, amount, currency, category, spent_on: spentOn, note });

  if (error) return { ok: false, error: error.message };

  refreshApp();
  return { ok: true };
}

export async function updateExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { t } = await getT();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: t.actions.missingExpense };

  const currency = readCurrency(formData);
  const amount = parseAmountFor(String(formData.get("amount") ?? ""), currency);
  if (amount === null) return { ok: false, error: t.actions.amountRequired };

  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { ok: false, error: t.actions.categoryRequired };

  const spentOn = String(formData.get("spent_on") ?? "").trim();
  if (!ISO_DATE.test(spentOn)) return { ok: false, error: t.actions.invalidDate };

  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;

  // RLS restricts this to the caller's own rows.
  const { error } = await supabase
    .from("expenses")
    .update({ amount, currency, category, spent_on: spentOn, note })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  refreshApp();
  return { ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("expenses").delete().eq("id", id);
  refreshApp();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function addCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { t } = await getT();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: t.actions.categoryNameRequired };
  if (name.length > 40) return { ok: false, error: t.actions.categoryNameTooLong };

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? t.actions.categoryExists : error.message,
    };
  }

  refreshApp();
  return { ok: true };
}

/**
 * Deleting a category only removes it from the picker — past expenses keep the
 * category name they were logged with.
 */
export async function deleteCategory(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("categories").delete().eq("id", id);
  refreshApp();
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export async function setMonthlyBudget(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const raw = String(formData.get("monthly_budget") ?? "").trim();
  const budget = raw === "" ? null : parseAmount(raw);
  if (raw !== "" && budget === null) {
    return { ok: false, error: (await getT()).t.actions.budgetInvalid };
  }

  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: user.id, monthly_budget: budget, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false, error: error.message };

  refreshApp();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

/**
 * Called directly from a button's onClick, not through a <form> — Server
 * Actions can be invoked as plain async functions outside forms too, taking
 * any serializable argument rather than only FormData.
 *
 * `onConflict: "endpoint"` makes this an upsert: the same browser
 * installation subscribing twice (e.g. after a permission reset) replaces its
 * row rather than accumulating a duplicate, and a device handed to a
 * different account re-points the existing row at the new user.
 */
export async function subscribePush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  // RLS scopes this to the caller's own rows regardless.
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/money";
import { today } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";

/**
 * Server Actions are reachable by direct POST, not just through the UI, so each
 * one re-checks auth. RLS is the real boundary — this is the friendly error.
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function refreshApp() {
  revalidatePath("/", "layout");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  refreshApp();
  redirect("/");
}

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Email and password are required." };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  // With email confirmation on, there's no session yet. That isn't a failure —
  // return it as a notice so the UI doesn't render it as an error.
  if (!data.session) {
    return {
      ok: true,
      message: "Account created. Check your email to confirm it, then sign in.",
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

export async function addExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const amount = parseAmount(String(formData.get("amount") ?? ""));
  if (amount === null) return { ok: false, error: "Enter an amount greater than zero." };

  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { ok: false, error: "Pick a category." };

  const spentOn = String(formData.get("spent_on") ?? "").trim() || today();
  if (!ISO_DATE.test(spentOn)) return { ok: false, error: "That date isn't valid." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;

  const { error } = await supabase
    .from("expenses")
    .insert({ user_id: user.id, amount, category, spent_on: spentOn, note });

  if (error) return { ok: false, error: error.message };

  refreshApp();
  return { ok: true };
}

export async function updateExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing expense." };

  const amount = parseAmount(String(formData.get("amount") ?? ""));
  if (amount === null) return { ok: false, error: "Enter an amount greater than zero." };

  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { ok: false, error: "Pick a category." };

  const spentOn = String(formData.get("spent_on") ?? "").trim();
  if (!ISO_DATE.test(spentOn)) return { ok: false, error: "That date isn't valid." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;

  // RLS restricts this to the caller's own rows.
  const { error } = await supabase
    .from("expenses")
    .update({ amount, category, spent_on: spentOn, note })
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

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Enter a category name." };
  if (name.length > 40) return { ok: false, error: "Keep the name under 40 characters." };

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
      error: error.code === "23505" ? "That category already exists." : error.message,
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
    return { ok: false, error: "Enter a budget greater than zero, or leave it blank." };
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

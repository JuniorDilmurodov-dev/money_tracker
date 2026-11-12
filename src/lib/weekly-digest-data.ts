import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays } from "@/lib/dates";
import {
  computeWeeklyDigest,
  type DigestRow,
  type WeeklyDigest,
} from "@/lib/weekly-digest";

/**
 * Digest for the Monday-start week beginning `weekStart`, compared with the
 * week before it. Always filters on `spent_on` (the day the money was spent),
 * never `created_at`.
 *
 * Takes the client as a parameter because two very different callers need it:
 * the cron route passes the service_role client (no session, so `user_id` is
 * the only thing scoping the query), the /haftalik page passes the cookie
 * client (RLS scopes it a second time). The explicit `user_id` filter is what
 * keeps the cron path from ever reading someone else's rows.
 */
export async function getWeeklyDigest(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
): Promise<WeeklyDigest> {
  const prevStart = addDays(weekStart, -7);
  const weekEnd = addDays(weekStart, 6);

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category, currency, spent_on")
    .eq("user_id", userId)
    .gte("spent_on", prevStart)
    .lte("spent_on", weekEnd)
    // Two weeks of one person's expenses; well under PostgREST's default cap.
    .limit(5000);

  if (error) throw new Error(`weekly digest: ${error.message}`);

  const current: DigestRow[] = [];
  const previous: DigestRow[] = [];
  for (const row of data ?? []) {
    const parsed: DigestRow = {
      amount: Number(row.amount),
      category: String(row.category),
      currency: row.currency === "USD" ? "USD" : "UZS",
    };
    (row.spent_on >= weekStart ? current : previous).push(parsed);
  }
  return computeWeeklyDigest(weekStart, current, previous);
}

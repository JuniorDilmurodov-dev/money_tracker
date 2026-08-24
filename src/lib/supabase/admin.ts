import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The service_role key bypasses row level security entirely. Only import this
 * from trusted, non-user-scoped server code:
 * - the reminder cron route (src/app/api/push/send-reminders/route.ts)
 * - the /admin dashboard (src/app/admin/page.tsx), which reads the
 *   auth.users-joining stats_* views and gates access with its own
 *   ADMIN_EMAIL check before this is ever called
 *
 * Never from anything that takes user input or runs on behalf of a specific
 * signed-in request, and never from a client component — the `server-only`
 * import above turns an accidental client-side import into a build error
 * instead of a leaked key.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

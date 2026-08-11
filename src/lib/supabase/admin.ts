import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The one place in this app that uses the service_role key. It bypasses row
 * level security entirely, so only import this from the reminder cron route
 * (src/app/api/push/send-reminders/route.ts) — never from anything that
 * takes user input or runs on behalf of a specific signed-in request.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

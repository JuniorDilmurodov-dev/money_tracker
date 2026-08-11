import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { today } from "@/lib/dates";

/**
 * Always sent in Uzbek, not the reader's site language: this is a background
 * nudge with no per-user session to read a locale cookie from, not a
 * rendered page. Deliberately no amount or balance — see sw.js's push
 * handler for why.
 */
const REMINDER_TITLE = "Xarajat";
const REMINDER_BODY = "Bugun hali xarajat kiritmadingiz.";

function vapidConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

/**
 * Triggered by Vercel Cron (see the `crons` entry in vercel.json), once a day
 * at 20:00 Asia/Tashkent. Only accounts that have push notifications on *and*
 * haven't logged an expense yet today get a push.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!vapidConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Push notifications are not configured." }, { status: 503 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const supabase = createAdminClient();
  const todayIso = today();

  const [{ data: subscriptions, error: subsError }, { data: loggedToday, error: expensesError }] =
    await Promise.all([
      supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth"),
      supabase.from("expenses").select("user_id").eq("spent_on", todayIso),
    ]);

  if (subsError || expensesError) {
    return Response.json(
      { error: (subsError ?? expensesError)!.message },
      { status: 500 },
    );
  }

  const loggedTodaySet = new Set((loggedToday ?? []).map((row) => row.user_id));
  const targets = (subscriptions ?? []).filter((sub) => !loggedTodaySet.has(sub.user_id));

  const outcomes = await Promise.all(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: REMINDER_TITLE, body: REMINDER_BODY, url: "/" }),
        );
        return "sent" as const;
      } catch (error) {
        // 404/410 means the browser dropped the subscription (uninstalled,
        // permission revoked) — clean it up so future runs stop trying it.
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        return "failed" as const;
      }
    }),
  );

  const sent = outcomes.filter((outcome) => outcome === "sent").length;

  return Response.json({ targeted: targets.length, sent, failed: outcomes.length - sent });
}

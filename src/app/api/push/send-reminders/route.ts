import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { digestWeekStart, isSunday, today } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n";
import { translateCategory } from "@/lib/i18n/categories";
import { buildDigestNotification, type DigestNotification } from "@/lib/weekly-digest";
import { getWeeklyDigest } from "@/lib/weekly-digest-data";

/**
 * Always sent in Uzbek, not the reader's site language: this is a background
 * nudge with no per-user session to read a locale cookie from, not a
 * rendered page. The daily reminder carries no amount or balance; the Sunday
 * digest deliberately does (see sw.js's push handler).
 */
const REMINDER_TITLE = "Xarajat";
const REMINDER_BODY = "Bugun hali xarajat kiritmadingiz.";

/** Users handled concurrently, so one slow push service can't stall the run. */
const BATCH_SIZE = 10;

type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type Admin = ReturnType<typeof createAdminClient>;

function vapidConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

/** Runs `fn` over `items` BATCH_SIZE at a time; a throw never aborts the rest. */
async function inBatches<T, R>(items: T[], fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    results.push(...(await Promise.allSettled(items.slice(i, i + BATCH_SIZE).map(fn))));
  }
  return results;
}

/** Sends one payload to one subscription. Returns whether the push service took it. */
async function push(supabase: Admin, sub: Subscription, payload: DigestNotification) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (error) {
    // 404/410 means the browser dropped the subscription (uninstalled,
    // permission revoked) — clean it up so future runs stop trying it.
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    }
    return false;
  }
}

function countSettled(results: PromiseSettledResult<boolean>[]) {
  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  return { sent, failed: results.length - sent };
}

async function sendReminders(supabase: Admin, subscriptions: Subscription[], todayIso: string) {
  const { data: loggedToday, error } = await supabase
    .from("expenses")
    .select("user_id")
    .eq("spent_on", todayIso);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const loggedTodaySet = new Set((loggedToday ?? []).map((row) => row.user_id));
  const targets = subscriptions.filter((sub) => !loggedTodaySet.has(sub.user_id));
  const payload = { title: REMINDER_TITLE, body: REMINDER_BODY, url: "/" };

  const results = await inBatches(targets, (sub) => push(supabase, sub, payload));
  return Response.json({ mode: "reminder", targeted: targets.length, ...countSettled(results) });
}

async function sendDigests(
  supabase: Admin,
  subscriptions: Subscription[],
  weekStart: string,
  dry: boolean,
) {
  const byUser = new Map<string, Subscription[]>();
  for (const sub of subscriptions) {
    byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub]);
  }

  const uz = getDictionary("uz");
  const categoryName = (stored: string) => translateCategory(stored, uz);

  type Outcome =
    | { userId: string; status: "sent" | "failed" | "skipped"; notification: DigestNotification }
    | { userId: string; status: "dry"; notification: DigestNotification };

  const results = await inBatches([...byUser.entries()], async ([userId, subs]): Promise<Outcome> => {
    const digest = await getWeeklyDigest(supabase, userId, weekStart);
    const notification = buildDigestNotification(digest, categoryName);
    if (dry) return { userId, status: "dry", notification };

    // Claim the (user, week) slot before sending: the primary key makes a
    // second run — a retry, a manual re-trigger — a no-op instead of a repeat.
    const { error: claimError } = await supabase
      .from("digest_sends")
      .insert({ user_id: userId, week_start: weekStart });
    if (claimError) {
      if (claimError.code === "23505") return { userId, status: "skipped", notification };
      throw new Error(claimError.message);
    }

    const pushes = await Promise.all(subs.map((sub) => push(supabase, sub, notification)));
    if (pushes.some(Boolean)) return { userId, status: "sent", notification };

    // Nothing was delivered: release the claim so a re-run can try again.
    await supabase.from("digest_sends").delete().eq("user_id", userId).eq("week_start", weekStart);
    return { userId, status: "failed", notification };
  });

  const outcomes = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const errored = results.length - outcomes.length;

  if (dry) {
    return Response.json({
      mode: "weekly",
      dry: true,
      weekStart,
      users: outcomes.map(({ userId, notification }) => ({ userId, ...notification })),
      errored,
    });
  }

  const count = (status: Outcome["status"]) => outcomes.filter((o) => o.status === status).length;
  return Response.json({
    mode: "weekly",
    weekStart,
    users: byUser.size,
    sent: count("sent"),
    skipped: count("skipped"),
    failed: count("failed") + errored,
  });
}

/**
 * Triggered by Vercel Cron (see vercel.json) once a day at 14:00 UTC, i.e.
 * 19:00 Asia/Tashkent (Hobby crons may fire up to an hour late). On Sundays
 * (Tashkent) it sends the weekly digest to everyone with push on; every other
 * day it sends the "nothing logged today" reminder to those who haven't
 * logged anything yet.
 *
 * Testing (needs the CRON_SECRET bearer like the real run):
 *   ?force=weekly       run the digest on any day
 *   ?force=weekly&dry=1 return the {title, body, url} per user; sends nothing
 *                       and writes nothing to digest_sends
 * `dry` only has an effect together with `force=weekly`.
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

  const params = new URL(request.url).searchParams;
  const forced = params.get("force") === "weekly";
  const dry = forced && params.get("dry") === "1";

  const supabase = createAdminClient();
  const todayIso = today();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (forced || isSunday(todayIso)) {
    return sendDigests(supabase, subscriptions ?? [], digestWeekStart(todayIso), dry);
  }
  return sendReminders(supabase, subscriptions ?? [], todayIso);
}

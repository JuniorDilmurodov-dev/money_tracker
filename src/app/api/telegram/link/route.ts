import crypto from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

/** Kirgan foydalanuvchi uchun 10 daqiqalik bir martalik Telegram ulash havolasi. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot) return Response.json({ error: "not_configured" }, { status: 500 });

  const code = crypto.randomBytes(18).toString("base64url");
  const admin = createAdminClient();
  await admin.from("telegram_link_codes").delete().eq("user_id", user.id);
  const { error } = await admin.from("telegram_link_codes").insert({
    code,
    user_id: user.id,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) return Response.json({ error: "db" }, { status: 500 });

  return Response.json({ url: `https://t.me/${bot}?start=link_${code}` });
}

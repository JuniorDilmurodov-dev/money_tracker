import crypto from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type TgUser = { id: number; first_name?: string; language_code?: string };

/** initData imzosini tekshiradi. Yaroqsiz yoki eskirgan bo'lsa null. */
export function validateInitData(initData: string, maxAgeSec = 86_400): TgUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const calc = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");

  const a = Buffer.from(calc);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;

  try {
    return JSON.parse(params.get("user") ?? "null") as TgUser | null;
  } catch {
    return null;
  }
}

/** Telegram ID bo'yicha Supabase foydalanuvchisini topadi yoki yaratadi. */
export async function getOrCreateTelegramUser(telegramId: number) {
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("telegram_users")
    .select("user_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (link) {
    const { data } = await admin.auth.admin.getUserById(link.user_id);
    if (data.user?.email) return { userId: link.user_id, email: data.user.email };
  }

  const email = `tg${telegramId}@tg.xarajat.uz`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomBytes(24).toString("hex"),
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");

  await admin
    .from("telegram_users")
    .upsert({ telegram_id: telegramId, user_id: data.user.id });

  return { userId: data.user.id, email };
}

export async function tgSend(chatId: number, text: string, extra: object = {}) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}
/**
 * Ulash kodi bilan Telegram'ni mavjud hisobga bog'laydi. Telegram ID avval
 * avtomatik yaratilgan bo'sh hisobga bog'langan bo'lishi mumkin — uning
 * xarajatlari asosiy hisobga ko'chiriladi va bo'sh hisob o'chiriladi.
 */
export async function redeemLinkCode(code: string, telegramId: number): Promise<boolean> {
  const admin = createAdminClient();

  // Bir martalik: o'chirilgan qator qaytsa, kod yaroqli bo'lgan.
  const { data: row } = await admin
    .from("telegram_link_codes")
    .delete()
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  if (!row) return false;
  const userId: string = row.user_id;

  const { data: existing } = await admin
    .from("telegram_users")
    .select("user_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (existing && existing.user_id !== userId) {
    await admin.from("expenses").update({ user_id: userId }).eq("user_id", existing.user_id);
    await admin.auth.admin.deleteUser(existing.user_id); // telegram_users qatori cascade bilan ketadi
  }

  // Bu hisob boshqa Telegram'ga ulangan bo'lsa, almashtiriladi.
  await admin.from("telegram_users").delete().eq("user_id", userId);
  const { error } = await admin
    .from("telegram_users")
    .upsert({ telegram_id: telegramId, user_id: userId });
  return !error;
}

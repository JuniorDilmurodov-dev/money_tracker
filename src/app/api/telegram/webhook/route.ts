import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateTelegramUser, redeemLinkCode, tgSend } from "@/lib/telegram";
import { parseAmount } from "@/lib/money";
import { today } from "@/lib/dates";

const ALIASES: Record<string, string> = {
  ovqat: "food", food: "food", еда: "food",
  transport: "transport", taksi: "transport", benzin: "transport",
  kommunal: "utilities", utilities: "utilities",
  kino: "entertainment", entertainment: "entertainment",
  xarid: "shopping", shopping: "shopping",
  dori: "health", health: "health",
};

export async function POST(request: Request) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  // Webhook ro'yxatdan o'tgan domen — ilovaning o'zi. Env bo'lsa, u ustun.
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const update = await request.json();
  const msg = update.message;
  if (!msg?.text || !msg.from) return Response.json({ ok: true });

  const chatId: number = msg.chat.id;
  const text: string = msg.text.trim();

  const openApp = {
    reply_markup: {
      inline_keyboard: [[{ text: "📱 Ilovani ochish", web_app: { url: APP_URL } }]],
    },
  };

  const linkMatch = text.match(/^\/start\s+link_([A-Za-z0-9_-]{16,64})$/);
  if (linkMatch) {
    const ok = await redeemLinkCode(linkMatch[1], msg.from.id);
    await tgSend(
      chatId,
      ok
        ? "✅ Telegram hisobingizga ulandi. Endi ilovani ochsangiz, barcha xarajatlaringiz shu yerda."
        : "Havola eskirgan yoki ishlatilgan. Ilovadagi Sozlamalardan yangisini oling.",
      openApp,
    );
    return Response.json({ ok: true });
  }

  if (text.startsWith("/start") || text.startsWith("/help")) {
    await tgSend(
      chatId,
      "Salom! Xarajat botiga xush kelibsiz.\n\nTez yozish: `50000 ovqat` yoki `12000 taksi uyga`\nTo'liq ilova uchun pastdagi tugmani bosing.",
      { parse_mode: "Markdown", ...openApp },
    );
    return Response.json({ ok: true });
  }

  const match = text.match(/^([\d\s.,]+?)\s+(\S+)\s*(.*)$/) ?? text.match(/^([\d\s.,]+)$/);
  const amount = match ? parseAmount(match[1]) : null;
  if (!match || amount === null) {
    await tgSend(chatId, "Tushunmadim. Namuna: `50000 ovqat`", { parse_mode: "Markdown", ...openApp });
    return Response.json({ ok: true });
  }

  const word = (match[2] ?? "").toLowerCase();
  const note = (match[3] ?? "").trim().slice(0, 280) || null;

  const { userId } = await getOrCreateTelegramUser(msg.from.id);
  const admin = createAdminClient();
  const { data: cats } = await admin.from("categories").select("name").eq("user_id", userId);

  const wanted = ALIASES[word] ?? word;
  const category =
    cats?.find((c) => c.name.toLowerCase() === wanted)?.name ??
    cats?.find((c) => c.name.toLowerCase().startsWith(wanted))?.name ??
    "Other";

  const { error } = await admin
    .from("expenses")
    .insert({ user_id: userId, amount, category, spent_on: today(), note });

  await tgSend(
    chatId,
    error
      ? "Saqlab bo'lmadi, keyinroq urinib ko'ring."
      : `✅ ${amount.toLocaleString("en-US").replace(/,/g, " ")} so'm — ${category}`,
    openApp,
  );
  return Response.json({ ok: true });
}
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateTelegramUser, validateInitData } from "@/lib/telegram";

export async function POST(request: Request) {
  const { initData } = await request.json().catch(() => ({ initData: "" }));
  const tgUser = validateInitData(String(initData ?? ""));
  if (!tgUser) return Response.json({ error: "invalid" }, { status: 401 });

  const { email } = await getOrCreateTelegramUser(tgUser.id);

  // Parolsiz kirish: server magic link yaratadi va o'zi tasdiqlaydi.
  const admin = createAdminClient();
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !link.properties?.hashed_token) {
    return Response.json({ error: "link" }, { status: 500 });
  }

  const supabase = await createClient(); // cookie'larni shu yozadi
  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (otpError) return Response.json({ error: "otp" }, { status: 500 });

  return Response.json({ ok: true });
}
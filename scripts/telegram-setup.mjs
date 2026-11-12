// Registers the bot with Telegram: webhook, menu button (opens the Mini App)
// and command list. Run after every deploy that changes the URL:
//   node --env-file=.env.local scripts/telegram-setup.mjs https://xarajat-uz.vercel.app
const appUrl = process.argv[2]?.replace(/\/$/, "");
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!appUrl?.startsWith("https://") || !token || !secret) {
  console.error("Usage: telegram-setup.mjs https://<domain>  (needs TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET)");
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(method, json.ok ? "ok" : json);
  if (!json.ok) process.exitCode = 1;
}

await call("setWebhook", {
  url: `${appUrl}/api/telegram/webhook`,
  secret_token: secret,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});
await call("setChatMenuButton", {
  menu_button: { type: "web_app", text: "Xarajat", web_app: { url: appUrl } },
});
await call("setMyCommands", {
  commands: [
    { command: "start", description: "Boshlash" },
    { command: "help", description: "Yordam" },
  ],
});

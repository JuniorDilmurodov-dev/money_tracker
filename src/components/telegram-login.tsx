"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type TgWebApp = { initData: string; ready(): void; expand(): void };
declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

/** Telegram ichida ochilganda avtomatik kiradi; oddiy brauzerda hech narsa qilmaydi. */
export function TelegramLogin() {
  const router = useRouter();

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (!app?.initData) return;
    app.ready();
    app.expand();

    fetch("/api/telegram/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initData: app.initData }),
    }).then((r) => {
      if (r.ok) router.replace("/");
    });
  }, [router]);

  return null;
}
"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n/client";

export function TelegramLinkCard({ linked }: { linked: boolean }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function connect() {
    setState("busy");
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error();
      window.location.href = json.url;
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">
        {linked ? t.telegram.linked : t.telegram.description}
      </p>
      <button
        type="button"
        onClick={connect}
        disabled={state === "busy"}
        className="h-11 self-start rounded-xl border border-line px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink disabled:opacity-60"
      >
        {linked ? t.telegram.relink : t.telegram.connect}
      </button>
      {state === "error" && <p className="text-sm text-danger">{t.telegram.error}</p>}
    </div>
  );
}

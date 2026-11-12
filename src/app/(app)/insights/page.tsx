import { getInsightsHistory, getInsightsUsedToday } from "@/lib/queries";
import Link from "next/link";
import { InsightsPanel } from "./panel";
import { getT } from "@/lib/i18n/server";

const DAILY_LIMIT = (() => {
  const configured = Number(process.env.INSIGHTS_DAILY_LIMIT ?? 3);
  return Number.isFinite(configured) && configured >= 0 ? configured : 3;
})();

export async function generateMetadata() {
  return { title: (await getT()).t.meta.insights };
}

export default async function InsightsPage() {
  const { t } = await getT();
  // Falls back to no history instead of a hard error if the `insights`
  // migration hasn't been applied to this Supabase project yet.
  const [history, used] = await Promise.all([
    getInsightsHistory(10).catch(() => []),
    getInsightsUsedToday().catch(() => 0),
  ]);
  const remaining = Math.max(DAILY_LIMIT - used, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight">{t.insights.title}</h1>
        <p className="text-sm text-ink-3">{t.insights.subtitle}</p>
      </div>
      <Link
        href="/haftalik"
        className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-surface-1 px-4 text-sm font-medium text-ink-2"
      >
        {t.weekly.link}
        <span aria-hidden>→</span>
      </Link>
      <InsightsPanel initialHistory={history} initialRemaining={remaining} limit={DAILY_LIMIT} />
    </div>
  );
}

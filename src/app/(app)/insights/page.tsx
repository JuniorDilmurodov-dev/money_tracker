import { getInsightsHistory } from "@/lib/queries";
import { InsightsPanel } from "./panel";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.insights };
}

export default async function InsightsPage() {
  const { t } = await getT();
  // Falls back to no history instead of a hard error if the `insights`
  // migration hasn't been applied to this Supabase project yet.
  const history = await getInsightsHistory(10).catch(() => []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-title font-semibold tracking-tight">{t.insights.title}</h1>
        <p className="text-sm text-ink-3">{t.insights.subtitle}</p>
      </div>
      <InsightsPanel initialHistory={history} />
    </div>
  );
}

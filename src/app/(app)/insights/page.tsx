import { getInsightsHistory } from "@/lib/queries";
import { InsightsPanel } from "./panel";

export const metadata = { title: "Insights — Xarajat" };

export default async function InsightsPage() {
  // Falls back to no history instead of a hard error if the `insights`
  // migration hasn't been applied to this Supabase project yet.
  const history = await getInsightsHistory(10).catch(() => []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-ink-3">
          A short read on your spending, generated on demand.
        </p>
      </div>
      <InsightsPanel initialHistory={history} />
    </div>
  );
}

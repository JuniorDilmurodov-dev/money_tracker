import { InsightsPanel } from "./panel";

export const metadata = { title: "Insights — Xarajat" };

export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-ink-3">
          A short read on your spending, generated on demand.
        </p>
      </div>
      <InsightsPanel />
    </div>
  );
}

import { Card } from "@/components/ui";
import { signOut } from "@/app/actions";
import { getCategories, getMonthlyBudget } from "@/lib/queries";
import { getSessionUser } from "@/lib/supabase/server";
import { BudgetForm, CategoryManager } from "./forms";

export const metadata = { title: "Settings — Xarajat" };

export default async function SettingsPage() {
  const [categories, budget, user] = await Promise.all([
    getCategories(),
    getMonthlyBudget(),
    getSessionUser(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-semibold tracking-tight">Settings</h1>

      <Card title="Monthly budget">
        <BudgetForm budget={budget} />
      </Card>

      <Card title="Categories">
        <CategoryManager categories={categories} />
      </Card>

      <Card title="Account">
        <p className="mb-4 text-sm text-ink-2">{user?.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-line px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </Card>
    </div>
  );
}

import { Card } from "@/components/ui";
import { signOut } from "@/app/actions";
import { getCategories, getMonthlyBudget } from "@/lib/queries";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelegramLinkCard } from "@/components/telegram-link";
import { InstallCard } from "@/components/pwa";
import { NotificationCard } from "@/components/notifications";
import { BudgetForm, CategoryManager } from "./forms";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).t.meta.settings };
}

export default async function SettingsPage() {
  const { t } = await getT();
  const [categories, budget, user] = await Promise.all([
    getCategories(),
    getMonthlyBudget(),
    getSessionUser(),
  ]);

  const { data: tgLink } = user
    ? await createAdminClient()
        .from("telegram_users")
        .select("telegram_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title font-semibold tracking-tight">{t.settings.title}</h1>

      <Card title={t.settings.monthlyBudget}>
        <BudgetForm budget={budget} />
      </Card>

      <Card title={t.settings.categories}>
        <CategoryManager categories={categories} />
      </Card>

      <Card title={t.pwa.install}>
        <InstallCard />
      </Card>

      <Card title={t.notifications.title}>
        <NotificationCard />
      </Card>

      <Card title={t.telegram.title}>
        <TelegramLinkCard linked={!!tgLink} />
      </Card>

      <Card title={t.settings.account}>
        <p className="mb-4 text-sm text-ink-2">{user?.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="h-11 rounded-xl border border-line px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            {t.settings.signOut}
          </button>
        </form>
      </Card>
    </div>
  );
}

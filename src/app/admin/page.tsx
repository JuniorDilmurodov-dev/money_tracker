import { redirect } from "next/navigation";

import { Card, EmptyState, ErrorText, StatTile } from "@/components/ui";
import { formatAmount } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

import { ActivityChart, type ActivityPoint } from "./activity-chart";

export const dynamic = "force-dynamic";

type DailyRow = {
  day: string;
  active_users: number;
  expense_count: number;
  total_amount: number;
};

type UserStatus = "active" | "fading" | "lost";

type UserRow = {
  user_id: string;
  email: string | null;
  signed_up_at: string;
  expense_count: number;
  last_expense_at: string | null;
  days_since_last_expense: number | null;
  status: UserStatus;
};

type RetentionRow = {
  cohort_week: string;
  cohort_size: number;
  retained_day1_count: number;
  retained_day7_count: number;
};

const STATUS_STYLE: Record<UserStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--good)" },
  fading: { label: "Fading", color: "#c99a1f" },
  lost: { label: "Lost", color: "var(--danger)" },
};

function tashkentToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatPct(count: number, of: number): string {
  if (of <= 0) return "—";
  return `${Math.round((count / of) * 100)}%`;
}

function MigrationMissing() {
  return (
    <Card>
      <ErrorText>
        The stats views don&apos;t exist yet. Run
        {" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
          supabase/migrations/20260824000000_admin_stats.sql
        </code>{" "}
        in the Supabase SQL editor, then reload this page.
      </ErrorText>
    </Card>
  );
}

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();
  if (!adminEmail || !userEmail || userEmail !== adminEmail) redirect("/");

  const adminClient = createAdminClient();

  const [dailyResult, usersResult, retentionResult] = await Promise.all([
    adminClient.from("stats_daily").select("*").returns<DailyRow[]>(),
    adminClient.from("stats_users").select("*").returns<UserRow[]>(),
    adminClient.from("stats_retention").select("*").returns<RetentionRow[]>(),
  ]);

  // Postgres itself would raise 42P01 ("relation does not exist"), but these
  // views are queried through PostgREST, which reports a missing table as
  // PGRST205 ("Could not find the table … in the schema cache") instead.
  const missingRelation = [dailyResult.error, usersResult.error, retentionResult.error].some(
    (error) => error?.code === "42P01" || error?.code === "PGRST205",
  );

  if (missingRelation) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-lg font-semibold">Admin</h1>
        <MigrationMissing />
      </div>
    );
  }

  const queryError = dailyResult.error ?? usersResult.error ?? retentionResult.error;
  if (queryError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-lg font-semibold">Admin</h1>
        <Card>
          <ErrorText>Could not load stats: {queryError.message}</ErrorText>
        </Card>
      </div>
    );
  }

  const daily = dailyResult.data ?? [];
  const users = usersResult.data ?? [];
  const retention = retentionResult.data ?? [];

  const today = tashkentToday();
  const todayRow = daily.find((row) => row.day === today);
  const totalUsers = users.length;
  const activeThisWeek = users.filter((row) => row.status === "active").length;
  const totalExpenses = users.reduce((sum, row) => sum + row.expense_count, 0);
  const expensesToday = todayRow?.expense_count ?? 0;

  const last30 = daily.slice(-30);
  const chartData: ActivityPoint[] = last30.map((row) => ({
    label: formatDate(row.day),
    activeUsers: row.active_users,
    expenseCount: row.expense_count,
  }));

  const sortedUsers = [...users].sort((a, b) => {
    const aTime = a.last_expense_at ? new Date(a.last_expense_at).getTime() : 0;
    const bTime = b.last_expense_at ? new Date(b.last_expense_at).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="mb-4 text-lg font-semibold">Admin</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total users" value={totalUsers} currency="" />
        <StatTile label="Active (7d)" value={activeThisWeek} currency="" />
        <StatTile label="Total expenses" value={totalExpenses} currency="" />
        <StatTile label="Added today" value={expensesToday} currency="" />
      </div>

      <div className="mt-4">
        <Card title="Daily activity — last 30 days">
          {chartData.length === 0 ? (
            <EmptyState>No activity in the last 90 days.</EmptyState>
          ) : (
            <ActivityChart data={chartData} />
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Users">
          {sortedUsers.length === 0 ? (
            <EmptyState>No users yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-ink-3">
                    <th className="pb-2 pr-3 font-medium">Email</th>
                    <th className="pb-2 pr-3 font-medium">Signed up</th>
                    <th className="pb-2 pr-3 font-medium">Expenses</th>
                    <th className="pb-2 pr-3 font-medium">Last activity</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((row) => {
                    const style = STATUS_STYLE[row.status];
                    return (
                      <tr key={row.user_id} className="border-t border-line">
                        <td className="py-2 pr-3 text-ink">{row.email ?? "—"}</td>
                        <td className="py-2 pr-3 text-ink-2">{formatDate(row.signed_up_at)}</td>
                        <td className="tnum py-2 pr-3 text-ink-2">
                          {formatAmount(row.expense_count)}
                        </td>
                        <td className="py-2 pr-3 text-ink-2">
                          {row.last_expense_at
                            ? `${formatDate(row.last_expense_at)} (${row.days_since_last_expense}d ago)`
                            : "never"}
                        </td>
                        <td className="py-2">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              color: style.color,
                              background: "var(--surface-2)",
                              border: `1px solid ${style.color}`,
                            }}
                          >
                            {style.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Weekly retention">
          {retention.length === 0 ? (
            <EmptyState>No cohorts yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-ink-3">
                    <th className="pb-2 pr-3 font-medium">Cohort week</th>
                    <th className="pb-2 pr-3 font-medium">Signed up</th>
                    <th className="pb-2 pr-3 font-medium">+1 day</th>
                    <th className="pb-2 font-medium">+7 days</th>
                  </tr>
                </thead>
                <tbody>
                  {retention.map((row) => (
                    <tr key={row.cohort_week} className="border-t border-line">
                      <td className="py-2 pr-3 text-ink">{formatDate(row.cohort_week)}</td>
                      <td className="tnum py-2 pr-3 text-ink-2">
                        {formatAmount(row.cohort_size)}
                      </td>
                      <td className="tnum py-2 pr-3 text-ink-2">
                        {formatAmount(row.retained_day1_count)} (
                        {formatPct(row.retained_day1_count, row.cohort_size)})
                      </td>
                      <td className="tnum py-2 text-ink-2">
                        {formatAmount(row.retained_day7_count)} (
                        {formatPct(row.retained_day7_count, row.cohort_size)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

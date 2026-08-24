-- ===========================================================================
-- Admin analytics views — DAU/retention for the /admin dashboard.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every view is CREATE OR REPLACE.
--
-- All three views group by `created_at` (when the row was written — i.e. when
-- the user had the app open), never by `spent_on` (the date the user typed in,
-- which can be backdated). `spent_on` describes spending history; `created_at`
-- describes activity, which is what these views measure.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- stats_daily: last 90 days of activity, bucketed by Tashkent-local day.
-- The DB stores timestamptz (UTC); every signed-up user is in Asia/Tashkent
-- (UTC+5), so bucketing in UTC would file a 1am–5am Tashkent expense under
-- the wrong day and "today" would read low until well into the morning.
-- ---------------------------------------------------------------------------
create or replace view public.stats_daily
  with (security_invoker = true) as
select
  (date_trunc('day', e.created_at at time zone 'Asia/Tashkent'))::date as day,
  count(distinct e.user_id) as active_users,
  count(*) as expense_count,
  coalesce(sum(e.amount), 0) as total_amount
from public.expenses e
where e.created_at >= now() - interval '90 days'
group by 1
order by 1;

-- ---------------------------------------------------------------------------
-- stats_users: one row per signed-up user, most recent activity and status.
-- LEFT JOIN so a user with zero expenses still appears (status "lost").
-- auth.users isn't reachable through the Data API directly, which is exactly
-- why the join happens in here instead of in the page's query.
-- ---------------------------------------------------------------------------
create or replace view public.stats_users
  with (security_invoker = true) as
select
  u.id as user_id,
  u.email,
  u.created_at as signed_up_at,
  count(e.id) as expense_count,
  max(e.created_at) as last_expense_at,
  case
    when max(e.created_at) is null then null
    else floor(extract(epoch from (now() - max(e.created_at))) / 86400)::int
  end as days_since_last_expense,
  case
    when max(e.created_at) is null then 'lost'
    when now() - max(e.created_at) <= interval '7 days' then 'active'
    when now() - max(e.created_at) <= interval '30 days' then 'fading'
    else 'lost'
  end as status
from auth.users u
left join public.expenses e on e.user_id = u.id
group by u.id, u.email, u.created_at;

-- ---------------------------------------------------------------------------
-- stats_retention: weekly signup cohorts, and how many were still active
-- 1 day and 7 days after they signed up.
-- ---------------------------------------------------------------------------
create or replace view public.stats_retention
  with (security_invoker = true) as
with cohorts as (
  select
    id as user_id,
    (date_trunc('week', created_at))::date as cohort_week,
    created_at as signed_up_at
  from auth.users
),
per_user as (
  select
    c.user_id,
    c.cohort_week,
    exists (
      select 1 from public.expenses e
      where e.user_id = c.user_id
        and e.created_at >= c.signed_up_at + interval '1 day'
    ) as retained_day1,
    exists (
      select 1 from public.expenses e
      where e.user_id = c.user_id
        and e.created_at >= c.signed_up_at + interval '7 days'
    ) as retained_day7
  from cohorts c
)
select
  cohort_week,
  count(*) as cohort_size,
  count(*) filter (where retained_day1) as retained_day1_count,
  count(*) filter (where retained_day7) as retained_day7_count
from per_user
group by cohort_week
order by cohort_week;

-- ===========================================================================
-- Access control.
--
-- `public` is exposed over the Data API (PostgREST) to `anon` and
-- `authenticated`. These views join `auth.users`, so without an explicit
-- revoke, any logged-in user could `select * from stats_users` over the API
-- and read every other user's email and expense activity — `security_invoker`
-- only makes the view respect the *caller's* RLS, it does not restrict who is
-- allowed to query the view in the first place. Only the admin page's
-- service-role client (which bypasses PostgREST's anon/authenticated grants
-- entirely) should ever read these.
-- ===========================================================================
revoke all on public.stats_daily, public.stats_users, public.stats_retention
  from anon, authenticated;

grant select on public.stats_daily, public.stats_users, public.stats_retention
  to service_role;

-- security_invoker means these views run with the *caller's* privileges, not
-- the view owner's. service_role bypasses row level security everywhere, but
-- that is a separate thing from a table-level GRANT — without this, the admin
-- page's service-role client hits "permission denied for table users" the
-- moment stats_users/stats_retention touch auth.users.
grant select on auth.users to service_role;

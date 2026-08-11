-- ===========================================================================
-- push_subscriptions: Web Push endpoints, one row per browser installation
-- that has notifications turned on. Read across users only by the reminder
-- cron route, which uses the service_role key and bypasses RLS on purpose —
-- every other access goes through the anon key and the policies below.
-- Run this once in the Supabase SQL editor. Safe to re-run.
-- ===========================================================================
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: select own" on public.push_subscriptions;
create policy "push_subscriptions: select own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions: insert own" on public.push_subscriptions;
create policy "push_subscriptions: insert own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions: update own" on public.push_subscriptions;
create policy "push_subscriptions: update own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions: delete own" on public.push_subscriptions;
create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

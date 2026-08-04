-- ===========================================================================
-- insights: AI-generated spending summaries, saved so they aren't
-- regenerated (and re-billed) every time the page is opened.
-- Run this once in the Supabase SQL editor. Safe to re-run.
-- ===========================================================================
create table if not exists public.insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  period       text not null check (period in ('week', 'month')),
  period_start date not null,
  text_en      text not null,
  text_uz      text not null,
  created_at   timestamptz not null default now()
);

create index if not exists insights_user_created_idx
  on public.insights (user_id, created_at desc);

alter table public.insights enable row level security;

drop policy if exists "insights: select own" on public.insights;
create policy "insights: select own" on public.insights
  for select using (auth.uid() = user_id);

drop policy if exists "insights: insert own" on public.insights;
create policy "insights: insert own" on public.insights
  for insert with check (auth.uid() = user_id);

drop policy if exists "insights: delete own" on public.insights;
create policy "insights: delete own" on public.insights
  for delete using (auth.uid() = user_id);

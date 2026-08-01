-- ===========================================================================
-- Expense tracker — schema + row level security
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: everything is idempotent.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- categories: per-user, editable list. Seeded with defaults on signup.
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists categories_user_idx
  on public.categories (user_id, sort_order, name);

-- ---------------------------------------------------------------------------
-- expenses
-- `category` is stored as text (not a FK) so renaming or deleting a category
-- never rewrites or destroys spending history.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     numeric(14, 2) not null check (amount > 0),
  category   text not null,
  spent_on   date not null default current_date,
  note       text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);

-- The two access patterns: "my expenses in a date range" and "my recent expenses".
create index if not exists expenses_user_date_idx
  on public.expenses (user_id, spent_on desc);
create index if not exists expenses_user_created_idx
  on public.expenses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- settings: one row per user. Monthly budget is optional (null = no budget).
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  monthly_budget numeric(14, 2) check (monthly_budget is null or monthly_budget > 0),
  updated_at    timestamptz not null default now()
);

-- ===========================================================================
-- Row Level Security — every table is user-scoped, no exceptions.
-- ===========================================================================
alter table public.categories enable row level security;
alter table public.expenses   enable row level security;
alter table public.settings   enable row level security;

-- categories
drop policy if exists "categories: select own" on public.categories;
create policy "categories: select own" on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories: insert own" on public.categories;
create policy "categories: insert own" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories: update own" on public.categories;
create policy "categories: update own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories: delete own" on public.categories;
create policy "categories: delete own" on public.categories
  for delete using (auth.uid() = user_id);

-- expenses
drop policy if exists "expenses: select own" on public.expenses;
create policy "expenses: select own" on public.expenses
  for select using (auth.uid() = user_id);

drop policy if exists "expenses: insert own" on public.expenses;
create policy "expenses: insert own" on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "expenses: update own" on public.expenses;
create policy "expenses: update own" on public.expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses: delete own" on public.expenses;
create policy "expenses: delete own" on public.expenses
  for delete using (auth.uid() = user_id);

-- settings
drop policy if exists "settings: select own" on public.settings;
create policy "settings: select own" on public.settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings: insert own" on public.settings;
create policy "settings: insert own" on public.settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings: update own" on public.settings;
create policy "settings: update own" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===========================================================================
-- Seed default categories for every new user.
-- ===========================================================================
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, sort_order)
  values
    (new.id, 'Food',          1),
    (new.id, 'Transport',     2),
    (new.id, 'Utilities',     3),
    (new.id, 'Entertainment', 4),
    (new.id, 'Shopping',      5),
    (new.id, 'Health',        6),
    (new.id, 'Other',         7)
  on conflict (user_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_categories on auth.users;
create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories();

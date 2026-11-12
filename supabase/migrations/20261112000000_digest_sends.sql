-- ===========================================================================
-- digest_sends: one row per (user, week) once the Sunday-evening weekly digest
-- push has been sent. The primary key is the idempotency guard: the cron route
-- inserts first and skips on a unique violation, so a retry or a double
-- invocation never pushes the same week twice.
-- RLS is on with no policies on purpose: only the service_role key (the cron
-- route) can read or write it; the anon/authenticated roles see nothing.
-- Safe to re-run.
-- ===========================================================================
create table if not exists public.digest_sends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  sent_at    timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.digest_sends enable row level security;

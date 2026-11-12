-- ===========================================================================
-- telegram_users: links a Telegram account to its Supabase user. Rows are
-- created by getOrCreateTelegramUser() the first time the Mini App or the bot
-- sees a Telegram id. The synthetic user behind it signs in with a server-made
-- magic link, so it has no password anyone knows.
-- RLS is on with no policies on purpose: only the service_role key (the
-- /api/telegram routes) can read or write it.
-- Safe to re-run.
-- ===========================================================================
create table if not exists public.telegram_users (
  telegram_id bigint primary key,
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.telegram_users enable row level security;

-- ===========================================================================
-- telegram_link_codes: one-time codes that attach a Telegram account to an
-- EXISTING Supabase user. The signed-in web app creates a code, the user opens
-- t.me/<bot>?start=<code>, and the webhook (which Telegram vouches for) links
-- the sender's telegram_id to that user. Codes expire and are single-use.
-- ===========================================================================
create table if not exists public.telegram_link_codes (
  code       text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.telegram_link_codes enable row level security;

# Xarajat — expense tracker

A small, fast expense tracker. Next.js 16 + TypeScript + Tailwind v4, Supabase for
data and auth, OpenAI for the written insights. Amounts are in UZS so'm.

- **Add** — log an expense in a few taps
- **Week** — this week vs last week, daily line, category breakdown
- **Month** — this month vs last month, category shares, optional budget bar
- **History** — filter by date range and category, edit or delete anything
- **Insights** — a 3–5 sentence read on your spending, generated only when asked

---

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **New project**. Pick any name, set a database password (you won't need it for
   this app — Supabase stores it), and choose the region closest to you.
   *Frankfurt (eu-central-1)* is usually the lowest latency from Uzbekistan.
   Stay on the **Free** plan.
3. Wait ~2 minutes for it to provision.

## 2. Create the tables and security policies

1. In the project, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/20260801000000_init.sql`](supabase/migrations/20260801000000_init.sql) and
   press **Run**.

That creates three tables — `expenses`, `categories`, `settings` — turns on row
level security with per-user policies on all three, and adds a trigger that seeds
the seven default categories whenever a new account signs up. The script is safe
to re-run.

To confirm it worked: **Table Editor** should list the three tables, each showing
an "RLS enabled" badge.

Alternatively, apply it with the Supabase CLI and a connection string from
Project Settings → Database:

```bash
npx supabase db push --db-url "postgresql://postgres:PASSWORD@db.YOUR-REF.supabase.co:5432/postgres"
```

## 3. Configure auth

**Authentication → Sign In / Providers**:

- **Email** should already be enabled. That's the only provider this app uses.
- **Confirm email** is on by default. Leave it on for a real deployment; for a
  single-user app on your own devices you can turn it off so signup logs you
  straight in. (With it on: sign up, click the link in the email, then sign in.)

**Authentication → URL Configuration**: set **Site URL** to `http://localhost:3000`
while developing, and to your deployed URL once it's live.

**Authentication → Emails → Confirm signup** (recommended). The stock template
uses `{{ .ConfirmationURL }}`, which points at Supabase's `/auth/v1/verify`.
That confirms the account fine — but it then redirects to the bare Site URL,
where the app has no session to pick up, so the reader is bounced to `/login`
and asked for the password they just set. It looks like the link failed.
Pointing the link at this app's callback instead:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

lets `src/app/auth/confirm/route.ts` do the verification itself, so clicking
the link signs you straight in. The route also accepts the `?code=` form that
`{{ .ConfirmationURL }}` produces, so the stock template keeps working if you'd
rather not touch it.

### Custom SMTP is not optional

Supabase's built-in email service sends **2 messages per hour for the whole
project**. It exists to let you click through signup once; it cannot run a real
deployment. Past that ceiling `signUp` returns `over_email_send_rate_limit` and
no account is created and no mail goes out — which looks, to the person at the
form, exactly like the app silently doing nothing. Worse, it feeds on itself:
no email arrives, so they try again, and each retry spends another message.

Two settings fix it, and **both are needed** — this is the part that catches
people out:

1. **Project Settings → Authentication → SMTP Settings.** Enable custom SMTP
   and fill in a provider's credentials.
2. **Authentication → Rate Limits → emails sent per hour.** Turning on custom
   SMTP only lifts the ceiling from 2/hour to 30/hour. Raise it yourself to
   match the provider's real allowance.

This deployment runs on `*.vercel.app`, so there is no domain to add SPF/DKIM
records to and domain-verifying providers (Resend, Mailgun) can't send to
arbitrary recipients. Brevo verifies a single **sender address** instead, which
works without owning a domain — 300 messages/day on the free plan.

| Supabase field | Value |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | the SMTP login from Brevo (looks like `…@smtp-brevo.com`) |
| Password | a Brevo **SMTP key** — not the account password |
| Sender email | an address verified under Brevo → Senders |
| Sender name | `Xarajat` |

A real domain is still the better long-term answer: deliverability from a
free-mail sender address is at the mercy of that provider's DMARC policy.

## 4. Get the environment variables

**Project Settings → API Keys** (or **Data API**):

| Dashboard value | Env var |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `publishable` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

The anon key is designed to be public — row level security is what protects the
data, which is why step 2 matters. **Never** put the `service_role` / secret key
anywhere it could reach the browser. Two routes use it server-side, where there
is no user session to scope RLS to: the push-notification cron route (§8) and
the admin dashboard (§9).

Then get an API key from
[platform.openai.com/api-keys](https://platform.openai.com/api-keys).

Copy the template and fill it in:

```bash
cp .env.local.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_TIMEZONE=Asia/Tashkent
```

`.env.local` is gitignored. `OPENAI_API_KEY` is read only in the route handler
on the server and never reaches the browser.

Insights are billed to that key no matter who pressed the button, so each
account may generate **3 per day** by default. Set `INSIGHTS_DAILY_LIMIT` to
change it, or to `0` to turn insights off. Raise it freely while the app is
only yours; leave it low before you let anyone else sign up, and set a hard
spend cap on the OpenAI account as well — the limit here bounds what one
account can spend, not how many accounts exist.

Push notifications are optional — see §8 for the four extra variables they
need. Without them the app works exactly as before; the Settings notification
card just won't appear.

The admin dashboard at `/admin` is optional too — see §9. Set `ADMIN_EMAIL`
to the one account allowed to view it; left unset, `/admin` redirects everyone
away.

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000, create an account, and log something.

To use it from your phone on the same Wi-Fi, run `npm run dev -- -H 0.0.0.0` and
visit `http://<your-mac-ip>:3000`.

## 6. Deployment

Live at **https://money-tracker-omega-three.vercel.app**, hosted on Vercel and
connected to this repository — pushes to `main` deploy automatically, and pull
requests get preview URLs.

The same environment variables are set in the Vercel project for the
production, preview and development environments. They are not read from
`.env.local` in a deployed build, so **adding a new variable means adding it in
Vercel too**, or the deployed app will fall back to its "not set" error path
(or, for the push variables, the feature silently staying off).

Supabase's auth URLs must match wherever the app runs:

| Setting | Value |
|---|---|
| Site URL | `https://money-tracker-omega-three.vercel.app` |
| Redirect URL | `https://money-tracker-omega-three.vercel.app/**` |
| Redirect URL | `http://localhost:3000/**` |

Site URL is where confirmation and password-recovery emails point. If it ever
drifts back to localhost, those emails silently break for every device except
the machine running `npm run dev`.

### Latency

Two things dominate how fast a page feels, and both are easy to get wrong:

1. **Compute must sit next to the database.** Supabase runs in `ap-south-1`
   (Mumbai), so `vercel.json` pins Serverless Functions to `bom1` (Mumbai).
   Vercel defaults new projects to `iad1` (Washington DC) — leaving that puts a
   US-to-India round trip on *every* query, several times per page render.
   **If you move the Supabase project, change `vercel.json` to match.**
2. **Auth is verified locally, not over the network.** The app calls
   `getClaims()`, never `getUser()`. `getUser()` hits `/auth/v1/user` on every
   single call; with a check in both `proxy.ts` and the app layout that was two
   sequential network round trips before any expense data was even requested.
   Because this project signs JWTs with an asymmetric key (ES256), `getClaims()`
   verifies the signature locally against a cached JWKS instead.

   This is not a security shortcut — the signature is cryptographically
   verified, and row level security is still enforced on every query. But it
   *does* mean the project must keep using asymmetric signing keys: switching
   back to a legacy shared secret would make `getClaims()` fall back to a
   network call and the win disappears.

## 7. Installing it as an app

Xarajat is a PWA: on a phone it installs to the home screen, opens without
browser chrome, and cold-starts from cache. There is no separate build and
nothing to submit to an app store — a push to `main` updates every install.

- **Android / Chrome** — a banner appears at the top of the app, or use
  **Settings → Install app**. Both fire Chrome's own install prompt.
- **iOS / Safari** — Safari has no install API, so it has to be done by hand:
  **Share → Add to Home Screen**. Settings → Install app says as much.

Requires HTTPS, which the Vercel deployment already has. On `localhost` it works
too (browsers treat localhost as secure); on a LAN IP over plain HTTP it does not
— the service worker will refuse to register.

The pieces, if you need to change them:

| File | Does |
|---|---|
| `src/app/manifest.ts` | name, icons, standalone display, long-press shortcuts |
| `src/app/icon-*.png/route.tsx` | 192/512 rasters + a padded maskable one, rendered at build time from the same mark as `icon.svg` |
| `public/sw.js` | the service worker — cache rules and the offline fallback |
| `src/app/offline/page.tsx` | what a navigation shows with no network |
| `src/lib/install-store.ts` | holds Chrome's one-shot `beforeinstallprompt` |
| `src/components/pwa.tsx` | worker registration, the banner, the Settings card |

**The service worker never caches your data.** Every route in this app is
per-user, so caching a rendered page would let it outlive the session. Only
hashed build assets under `/_next/static/` and the public `/offline` page are
stored; API routes, RSC payloads, `/login` and every Server Action go straight to
the network. This is also why offline shows a fallback page rather than your last
expenses.

**After changing `public/sw.js`, bump `VERSION` in it.** Installed clients
delete every cache that doesn't match the current name on activation — that is
what evicts the previous build. Skip the bump and old clients keep their old
cached assets.

> **Dark mode extensions.** This app is already dark by default. Browser
> extensions like Dark Reader will re-darken it and flatten the contrast the
> colour palette was chosen for — add the site to the extension's exception
> list rather than debugging the CSS.

## 8. Push notifications

Optional. When set up, Settings gets a card to turn on a daily reminder —
sent once at 19:00 in `NEXT_PUBLIC_APP_TIMEZONE` (cron `0 14 * * *`, UTC; Hobby
crons can fire up to an hour late), only to accounts that haven't logged an
expense yet that day. On **Sundays** the same cron sends the weekly digest
instead: a rounded total, the change versus last week and the top category,
built from SQL only (no OpenAI), opening `/haftalik?w=<Monday>`. Unlike the
daily reminder, the digest does put an amount on the lock screen.
`digest_sends` (migration `20261112000000`) guarantees one digest per user per
week.

Test it with the cron secret: `GET /api/push/send-reminders?force=weekly&dry=1`
with `Authorization: Bearer $CRON_SECRET` returns each user's
`{title, body, url}` and sends/writes nothing; drop `dry=1` to really send.
`npx tsx scripts/digest-check.ts` runs the week-boundary and copy checks.

1. Generate a key pair: `npx web-push generate-vapid-keys`.
2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and
   `VAPID_SUBJECT` (a `mailto:` address) from `.env.local.example`.
3. Set `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API Keys**. It is
   created by `src/lib/supabase/admin.ts` and imported only by the cron route
   (`src/app/api/push/send-reminders/route.ts`) and the admin dashboard (§9).
4. Set `CRON_SECRET` to any random string. `vercel.json` schedules Vercel Cron
   to call the reminder route daily; Vercel signs that call with the secret
   as an `Authorization: Bearer` header automatically.
5. Apply `supabase/migrations/20260811000000_push_subscriptions.sql`, same as
   any other migration (§2).

On iOS, notification permission can only be requested once the app is
installed to the home screen (§7) — the Settings card says so rather than
showing a button that would silently fail. Android has no such restriction.

**After changing `public/sw.js`, bump `VERSION`** — same rule as §7, and it
covers this file too.

## 9. Admin dashboard

Optional. `/admin` shows whether people are actually using the app: total and
7-day-active users, expenses added today, a 30-day activity chart, a per-user
table (last activity and an active / fading / lost status), and weekly signup
retention (+1 day, +7 days).

1. Set `ADMIN_EMAIL` to the single account allowed in. It is compared against
   the signed-in user's email server-side before any data is read; unset means
   `/admin` is closed to everyone (fail closed).
2. Set `SUPABASE_SERVICE_ROLE_KEY` (§8 step 3) — the stats span every user, so
   the page reads through a service-role client that bypasses RLS.
3. Apply `supabase/migrations/20260824000000_admin_stats.sql` (§2). It creates
   the `stats_daily`, `stats_users` and `stats_retention` views. Until it runs,
   `/admin` shows a "run this migration" notice instead of the dashboard.

The numbers come from Postgres views. Client-side traffic (page views, Web
Vitals) is handled separately by Vercel Analytics and Speed Insights, wired
into the root layout — no env vars, live in the Vercel project's Analytics tab.

---

## How it's put together

```
src/
  proxy.ts                  session refresh + auth gate (Next 16 renamed middleware → proxy)
  app/
    actions.ts              every mutation, as Server Actions
    api/insights/route.ts   the only LLM call in the app
    login/                  sign in / sign up
    admin/                  usage dashboard, gated by ADMIN_EMAIL (§9)
    (app)/                  everything behind auth: add, week, month, history, insights, settings
  components/               quick-add, expense list, charts, nav
  lib/
    supabase/               browser + server clients
    dates.ts                "YYYY-MM-DD" date maths in a fixed timezone
    money.ts                so'm formatting and parsing
    queries.ts              reads + aggregation
supabase/migrations/       tables, indexes, RLS policies, category seeding
```

**Security.** Every table has row level security with `auth.uid() = user_id` on
select, insert, update and delete, so a user can only ever read or write their own
rows — that holds even if a bug in the app sends the wrong query. Server Actions
re-check the session on top of that, since they're reachable by direct POST.

**Dates.** Everything is stored and computed as `YYYY-MM-DD` strings in a fixed
timezone (`NEXT_PUBLIC_APP_TIMEZONE`, default `Asia/Tashkent`) so a late-night
expense on a UTC server doesn't land on the wrong day. Weeks start Monday.

**Categories.** Editable in Settings. Expenses store the category as text rather
than a foreign key, so deleting a category never rewrites or deletes history.

**Charts.** The category breakdown is a ranked bar chart rather than a donut —
seven categories are easier to compare by length than by hue, and every bar is
labelled with its name, amount and share, so nothing depends on color alone. The
two-series palette is validated for contrast and color-vision deficiency in both
light and dark themes.

**Insights.** `POST /api/insights` sends only aggregates — category totals for this
period and last, plus repeated-purchase counts — never your raw expense list. It
runs on button press only, uses `gpt-4o-mini` (override with `OPENAI_MODEL`) with a
400-token cap, and returns plain text.

The daily cap is counted from the `insights` table itself — one row is written
per generation, so the saved history doubles as the usage meter and no separate
quota table can drift out of step with it. The count is taken after the
free early exits (not signed in, nothing logged this period) and before the
model call, so a day's allowance is only spent on requests that reach OpenAI.
If the count query fails the request is refused rather than allowed through: a
quota that can't be read can't be enforced, and the usual cause is the
`insights` migration not having been applied.

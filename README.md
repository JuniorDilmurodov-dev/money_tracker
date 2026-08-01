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

## 4. Get the environment variables

**Project Settings → API Keys** (or **Data API**):

| Dashboard value | Env var |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `publishable` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

The anon key is designed to be public — row level security is what protects the
data, which is why step 2 matters. **Never** put the `service_role` / secret key in
this app.

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

The same four environment variables are set in the Vercel project for the
production, preview and development environments. They are not read from
`.env.local` in a deployed build, so **adding a new variable means adding it in
Vercel too**, or the deployed app will fall back to its "not set" error path.

Supabase's auth URLs must match wherever the app runs:

| Setting | Value |
|---|---|
| Site URL | `https://money-tracker-omega-three.vercel.app` |
| Redirect URL | `https://money-tracker-omega-three.vercel.app/**` |
| Redirect URL | `http://localhost:3000/**` |

Site URL is where confirmation and password-recovery emails point. If it ever
drifts back to localhost, those emails silently break for every device except
the machine running `npm run dev`.

> **Dark mode extensions.** This app is already dark by default. Browser
> extensions like Dark Reader will re-darken it and flatten the contrast the
> colour palette was chosen for — add the site to the extension's exception
> list rather than debugging the CSS.

---

## How it's put together

```
src/
  proxy.ts                  session refresh + auth gate (Next 16 renamed middleware → proxy)
  app/
    actions.ts              every mutation, as Server Actions
    api/insights/route.ts   the only LLM call in the app
    login/                  sign in / sign up
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

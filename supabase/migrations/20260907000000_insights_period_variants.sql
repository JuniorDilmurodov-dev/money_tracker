-- ===========================================================================
-- Insights periods expand from week/month to explicit this/last variants:
-- this_week, last_week, this_month, last_month. The check constraint is
-- dropped before the UPDATE — Postgres re-checks the constraint on every row
-- an UPDATE touches, so rewriting "week"/"month" to their "this_*" form while
-- the old two-value constraint is still in place would reject the write
-- filtering on the very values it's about to replace. Existing rows only
-- ever hold "week"/"month"; the app itself no longer writes those going
-- forward.
-- Run this once in the Supabase SQL editor. Safe to re-run.
-- ===========================================================================

begin;

alter table public.insights
  drop constraint if exists insights_period_check;

update public.insights set period = 'this_week' where period = 'week';
update public.insights set period = 'this_month' where period = 'month';

alter table public.insights
  add constraint insights_period_check
  check (period in ('this_week', 'last_week', 'this_month', 'last_month'));

commit;

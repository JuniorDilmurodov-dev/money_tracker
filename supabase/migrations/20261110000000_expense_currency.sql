-- Per-expense currency: "UZS" (so'm) or "USD". No conversion, ever — totals are
-- always kept per currency. Existing rows become UZS via the column default.
alter table public.expenses add column if not exists currency text not null default 'UZS';
alter table public.expenses drop constraint if exists expenses_currency_check;
alter table public.expenses add constraint expenses_currency_check check (currency in ('UZS','USD'));

-- ===========================================================================
-- Insights become single-language: the user picks the language before
-- generating, and the model writes only that one. Roughly a third of the
-- output tokens of the old write-all-languages call.
-- Run this once in the Supabase SQL editor. Safe to re-run.
-- ===========================================================================

-- Russian joins the two languages the table already knew about.
alter table public.insights
  add column if not exists text_ru text;

-- Which language this row was generated in. Null on rows written before this
-- migration — those hold English *and* Uzbek, and the app keeps rendering them
-- by falling back to whichever of the two matches the reader.
alter table public.insights
  add column if not exists lang text;

alter table public.insights
  drop constraint if exists insights_lang_check;
alter table public.insights
  add constraint insights_lang_check
  check (lang is null or lang in ('uz', 'ru', 'en'));

-- A single-language row fills exactly one of the three text columns, so the
-- two original ones can no longer be required.
alter table public.insights alter column text_en drop not null;
alter table public.insights alter column text_uz drop not null;

-- Whatever else is true, a row has to carry text in at least one language.
alter table public.insights
  drop constraint if exists insights_text_present_check;
alter table public.insights
  add constraint insights_text_present_check
  check (text_en is not null or text_ru is not null or text_uz is not null);

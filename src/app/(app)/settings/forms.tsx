"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { addCategory, deleteCategory, setMonthlyBudget } from "@/app/actions";
import { ErrorText } from "@/components/ui";
import { formatAmount } from "@/lib/money";
import { useT } from "@/lib/i18n/client";
import { translateCategory } from "@/lib/i18n/categories";
import type { ActionResult, Category } from "@/lib/types";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 shrink-0 rounded-xl bg-series-1 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function BudgetForm({ budget }: { budget: number | null }) {
  const t = useT();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    setMonthlyBudget,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-ink-3">{t.settings.budgetLabel}</span>
          <input
            name="monthly_budget"
            inputMode="decimal"
            defaultValue={budget ? formatAmount(budget) : ""}
            placeholder={t.settings.budgetPlaceholder}
            className="tnum h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
          />
        </label>
        <Submit label={t.settings.save} />
      </div>
      {state && !state.ok && <ErrorText>{state.error}</ErrorText>}
      {state?.ok && <p className="text-sm text-ink-3">{t.settings.saved}</p>}
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const t = useT();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    addCategory,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.id}>
            <form action={deleteCategory} className="contents">
              <input type="hidden" name="id" value={c.id} />
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface-2 pl-4 pr-2 text-sm">
                {translateCategory(c.name, t)}
                <button
                  type="submit"
                  aria-label={t.settings.removeCategory(translateCategory(c.name, t))}
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-3 transition-colors hover:text-ink"
                >
                  ✕
                </button>
              </span>
            </form>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-ink-3">{t.settings.addCategory}</span>
          <input
            name="name"
            maxLength={40}
            placeholder={t.settings.categoryPlaceholder}
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
          />
        </label>
        <Submit label={t.settings.add} />
      </form>

      {state && !state.ok && <ErrorText>{state.error}</ErrorText>}

      <p className="text-xs text-ink-3">{t.settings.removalNote}</p>
    </div>
  );
}

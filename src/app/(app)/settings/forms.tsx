"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { addCategory, deleteCategory, setMonthlyBudget } from "@/app/actions";
import { ErrorText } from "@/components/ui";
import { formatAmount } from "@/lib/money";
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
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    setMonthlyBudget,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs text-ink-3">Amount in so&apos;m (blank = no budget)</span>
          <input
            name="monthly_budget"
            inputMode="decimal"
            defaultValue={budget ? formatAmount(budget) : ""}
            placeholder="e.g. 5 000 000"
            className="tnum h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
          />
        </label>
        <Submit label="Save" />
      </div>
      {state && !state.ok && <ErrorText>{state.error}</ErrorText>}
      {state?.ok && <p className="text-sm text-ink-3">Saved ✓</p>}
    </form>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
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
                {c.name}
                <button
                  type="submit"
                  aria-label={`Remove ${c.name}`}
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
          <span className="text-xs text-ink-3">Add a category</span>
          <input
            name="name"
            maxLength={40}
            placeholder="e.g. Coffee"
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
          />
        </label>
        <Submit label="Add" />
      </form>

      {state && !state.ok && <ErrorText>{state.error}</ErrorText>}

      <p className="text-xs text-ink-3">
        Removing a category only takes it out of the picker — expenses already logged
        under it keep their category.
      </p>
    </div>
  );
}

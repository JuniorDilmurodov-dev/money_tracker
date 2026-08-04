"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteExpense, updateExpense } from "@/app/actions";
import { DateField } from "@/components/date-field";
import { ErrorText } from "@/components/ui";
import { formatRelativeDay, today } from "@/lib/dates";
import { formatAmountInput, formatSom, handleAmountInputChange } from "@/lib/money";
import type { Category, Expense } from "@/lib/types";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink-2 transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-series-1 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "…" : "Save"}
    </button>
  );
}

function EditForm({
  expense,
  categories,
  onDone,
}: {
  expense: Expense;
  categories: Category[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(() => formatAmountInput(String(Math.round(expense.amount))));
  const [spentOn, setSpentOn] = useState(expense.spent_on);

  // Closing on success happens in the action, not in an effect watching it.
  async function handleSubmit(formData: FormData) {
    const result = await updateExpense(null, formData);
    if (result.ok) onDone();
    else setError(result.error);
  }

  // A category that was later deleted still needs to show up for its own rows.
  const options = categories.some((c) => c.name === expense.category)
    ? categories.map((c) => c.name)
    : [expense.category, ...categories.map((c) => c.name)];

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 border-t border-line px-4 py-4">
      <input type="hidden" name="id" value={expense.id} />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">Amount</span>
          <input
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountInputChange(e, setAmount)}
            required
            className="tnum h-11 rounded-lg border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink-3">Date</span>
          <input type="hidden" name="spent_on" value={spentOn} />
          <DateField value={spentOn} onChange={(v) => v && setSpentOn(v)} max={today()} className="rounded-lg" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">Category</span>
        <select
          name="category"
          defaultValue={expense.category}
          className="h-11 rounded-lg border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
        >
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">Note</span>
        <input
          name="note"
          maxLength={280}
          defaultValue={expense.note ?? ""}
          className="h-11 rounded-lg border border-line bg-surface-2 px-3 text-base outline-none focus:border-line-strong"
        />
      </label>

      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex items-center gap-2">
        <SaveButton />
        <button
          type="button"
          onClick={onDone}
          className="h-10 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Cancel
        </button>
        <span className="flex-1" />
      </div>

      {/* Nested <form> is invalid HTML, so delete lives beside the edit form. */}
    </form>
  );
}

function ExpenseRow({
  expense,
  categories,
  showDate,
}: {
  expense: Expense;
  categories: Category[];
  showDate: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{expense.category}</div>
            <div className="truncate text-xs text-ink-3">
              {showDate && formatRelativeDay(expense.spent_on)}
              {showDate && expense.note ? " · " : ""}
              {expense.note}
            </div>
          </div>
          <div className="tnum shrink-0 text-sm font-semibold">
            {formatSom(expense.amount)}
          </div>
        </button>
      </div>

      {editing && (
        <>
          <EditForm
            expense={expense}
            categories={categories}
            onDone={() => setEditing(false)}
          />
          <form action={deleteExpense} className="flex justify-end px-4 pb-4">
            <input type="hidden" name="id" value={expense.id} />
            <DeleteButton />
          </form>
        </>
      )}
    </li>
  );
}

export function ExpenseList({
  expenses,
  categories,
  showDate = true,
}: {
  expenses: Expense[];
  categories: Category[];
  showDate?: boolean;
}) {
  return (
    <ul className="-mx-4 sm:-mx-5">
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          categories={categories}
          showDate={showDate}
        />
      ))}
    </ul>
  );
}

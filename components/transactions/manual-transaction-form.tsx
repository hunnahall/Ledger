"use client";

import { useRef, useState, type FormEvent } from "react";
import { useModal } from "@/components/ui/modal";
import { createManualTransaction, suggestCategoryForDescription } from "@/lib/actions/transactions";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";

type Option = { id: string; name: string };
// No "transfer" choice here — Source Transfers on the Budget page cover
// moving money between a user's own sources now; recording one as a manual
// transaction would just double it.
type TypeChoice = "expense" | "income" | "exclude";
type IncomeAction = "include_in_budget" | "add_to_source" | "create_source";

const fieldLabel = "flex flex-col gap-1 text-sm";

function localToday() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

type FormProps = {
  categories: Option[];
  sources: Option[];
  defaultSourceId: string | null;
  // No Account field in this form (see the hidden input below) — every
  // manual entry files under whichever account getFilterOptions resolved
  // as the account meant for this (the is_manual one; see the Accounts
  // page), same as the row-level Account tooltip in TransactionList reads
  // off txn.accounts, just decided once here instead of picked per row.
  defaultAccountId: string | null;
  advanced: boolean;
};

// The "Add transaction" dialog's form. Closes itself once the add succeeds.
function ManualTransactionForm({
  categories,
  sources,
  defaultSourceId,
  defaultAccountId,
  advanced,
  onDone,
}: FormProps & { onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [typeChoice, setTypeChoice] = useState<TypeChoice>("expense");
  const [incomeAction, setIncomeAction] = useState<IncomeAction>("include_in_budget");
  const [categoryId, setCategoryId] = useState("");
  const [sourceId, setSourceId] = useState(defaultSourceId ?? "");
  // A Category only applies to Budget money (or money with no Source yet),
  // the same rule the database enforces (transactions_tidy).
  const categoryApplies = sourceId === "" || sourceId === defaultSourceId;
  // Tracks whether the current category came from the user's own pick vs. an
  // auto-fill from a learned rule, so a later description blur can overwrite
  // an auto-filled guess but never a manual choice. Mirrored into state (for
  // the hidden form field) and a ref (for a synchronous read across the
  // suggestion lookup's await).
  const [categorySource, setCategorySource] = useState<"manual" | "auto" | null>(null);
  const categorySourceRef = useRef<"manual" | "auto" | null>(null);
  // Starts on today so a quick entry needs no date pick.
  const [postedDate, setPostedDate] = useState(() => localToday());
  const [error, setError] = useState<string | null>(null);

  function setCategory(value: string, source: "manual" | "auto" | null) {
    setCategoryId(value);
    setCategorySource(source);
    categorySourceRef.current = source;
  }

  function handleCategoryChange(value: string) {
    setCategory(value, value ? "manual" : null);
  }

  async function handleDescriptionBlur(description: string) {
    const isManual = () => categorySourceRef.current === "manual";
    if (isManual()) return;
    const trimmed = description.trim();
    if (!trimmed) return;
    const rule = await suggestCategoryForDescription(trimmed);
    if (isManual()) return;
    setCategory(rule?.categoryId ?? "", rule ? "auto" : null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    // Adding never pauses to offer saving a rule (a confirm prompt there
    // broke the "fill it in and you're done" flow). Rules are managed on the
    // Rules page, or from the rule builder on a posted row.
    formData.set("rule_action", "skip");

    setPending(true);
    const result = await createManualTransaction(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setError(null);
    form.reset();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Add Transaction</h2>
      {/* No visible Account field — see defaultAccountId above. */}
      <input type="hidden" name="account_id" value={defaultAccountId ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className={fieldLabel}>
          Description
          <Input
            type="text"
            name="description"
            required
            autoFocus
            placeholder="e.g. Trader Joe's"
            onBlur={(e) => handleDescriptionBlur(e.target.value)}
          />
        </label>
        <label className={fieldLabel}>
          Date
          <Input
            type="date"
            name="posted_date"
            required
            value={postedDate}
            onChange={(e) => setPostedDate(e.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>
          Amount
          <Input type="number" name="amount" step="0.01" min="0" required onKeyDown={stepAmountByDollar} />
        </label>
        <label className={fieldLabel}>
          Type
          <Select name="type_choice" value={typeChoice} onChange={(value) => setTypeChoice(value as TypeChoice)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="exclude">Exclude</option>
          </Select>
        </label>
      </div>

      {/* Source before Category, mirroring the Transactions table's column
          order. */}
      {typeChoice === "expense" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            Source
            <Select name="source_id" value={sourceId} onChange={setSourceId} placeholder="No source">
              <option value="">No source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>
          {categoryApplies && (
            <label className={fieldLabel}>
              Category
              <Select name="category_id" value={categoryId} onChange={handleCategoryChange} placeholder="Uncategorized">
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <input type="hidden" name="category_source" value={categorySource ?? ""} />
            </label>
          )}
        </div>
      )}

      {typeChoice === "income" && advanced && (
        <p className="text-xs text-muted">
          Tracked to the Income source, then moved into the Budget at the start of next month.
        </p>
      )}

      {typeChoice === "income" && !advanced && (
        <>
          <fieldset className={fieldLabel}>
            <legend className="mb-1">Income</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["include_in_budget", "Add to Income"],
                  ["add_to_source", "Add to source"],
                  ["create_source", "Create a source"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5 text-sm text-foreground">
                  <input
                    type="radio"
                    name="income_action"
                    value={value}
                    checked={incomeAction === value}
                    onChange={() => setIncomeAction(value)}
                    className="accent-[var(--accent)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {incomeAction === "add_to_source" && (
            <label className={fieldLabel}>
              Source
              <Select name="source_id" placeholder="Choose a source">
                <option value="">Choose a source</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
          )}

          {incomeAction === "create_source" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabel}>
                New source name
                <Input type="text" name="new_source_name" required placeholder="e.g. Bonus" />
              </label>
              <label className={fieldLabel}>
                Source type
                <Select name="new_source_type" defaultValue="reimbursement">
                  <option value="reimbursement">Reimbursement</option>
                </Select>
              </label>
            </div>
          )}
        </>
      )}

      {typeChoice === "exclude" && (
        <p className="text-xs text-muted">Left out of every figure: no category, source or budget tracking.</p>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Adding" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}

// The Transactions page's one accent button.
export function AddTransactionButton(props: FormProps) {
  const { open, close, modal } = useModal();
  return (
    <>
      <Button type="button" variant="primary" onClick={() => open(<ManualTransactionForm {...props} onDone={close} />)}>
        <AddIcon size={16} />
        Add transaction
      </Button>
      {modal}
    </>
  );
}

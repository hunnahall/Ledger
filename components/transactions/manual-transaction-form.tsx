"use client";

import { useState } from "react";
import { createManualTransaction, suggestCategoryForDescription } from "@/lib/actions/transactions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddIcon } from "@/components/ui/icons";

type Suggestion = { categoryId: string; categoryName: string };

type Option = { id: string; name: string };
type BucketOption = { value: string; label: string };
type TypeChoice = "expense" | "income" | "transfer" | "exclude";
type IncomeAction = "include_in_budget" | "add_to_source" | "create_source";

const fieldLabel = "flex flex-col gap-1 text-xs text-muted";
const fieldInput =
  "rounded-md border border-border bg-background px-2 py-1.5 text-sm";

export function ManualTransactionForm({
  accounts,
  categories,
  sources,
  bucketOptions,
  defaultSourceId,
}: {
  accounts: Option[];
  categories: Option[];
  sources: Option[];
  bucketOptions: BucketOption[];
  defaultSourceId: string | null;
}) {
  const [typeChoice, setTypeChoice] = useState<TypeChoice>("expense");
  const [incomeAction, setIncomeAction] = useState<IncomeAction>("include_in_budget");
  const [categoryId, setCategoryId] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  async function handleDescriptionBlur(description: string) {
    const trimmed = description.trim();
    if (!trimmed) {
      setSuggestion(null);
      return;
    }
    const result = await suggestCategoryForDescription(trimmed);
    setSuggestion(result);
  }

  return (
    <form
      action={createManualTransaction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <label className={fieldLabel}>
        Date
        <input type="date" name="posted_date" required className={fieldInput} />
      </label>
      <label className={fieldLabel}>
        Account
        <Select name="account_id" required uiSize="sm" className="w-36">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={`flex flex-1 min-w-40 flex-col gap-1 text-xs text-muted`}>
        Description
        <input
          type="text"
          name="description"
          required
          placeholder="e.g. Trader Joe's"
          className={fieldInput}
          onBlur={(e) => handleDescriptionBlur(e.target.value)}
        />
      </label>
      <label className={fieldLabel}>
        Amount
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0"
          required
          className={`w-28 ${fieldInput}`}
        />
      </label>

      <label className={fieldLabel}>
        Type
        <Select
          name="type_choice"
          uiSize="sm"
          className="w-32"
          value={typeChoice}
          onChange={(value) => setTypeChoice(value as TypeChoice)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
          <option value="exclude">Exclude</option>
        </Select>
      </label>

      {(typeChoice === "expense" || typeChoice === "income") && (
        <label className={fieldLabel}>
          Category
          <Select
            name="category_id"
            uiSize="sm"
            className="w-36"
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Uncategorized"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {suggestion && !categoryId && (
            <button
              type="button"
              onClick={() => setCategoryId(suggestion.categoryId)}
              className="text-left text-xs text-muted hover:underline"
            >
              Suggested: {suggestion.categoryName}
            </button>
          )}
        </label>
      )}

      {typeChoice === "expense" && (
        <label className={fieldLabel}>
          Source
          <Select
            name="source_id"
            uiSize="sm"
            className="w-36"
            defaultValue={defaultSourceId ?? ""}
            placeholder="No source"
          >
            <option value="">No source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
      )}

      {typeChoice === "income" && (
        <>
          <fieldset className={fieldLabel}>
            <legend className="mb-1">Income</legend>
            <div className="flex flex-wrap gap-3 pb-2">
              <label className="flex items-center gap-1.5 text-foreground">
                <input
                  type="radio"
                  name="income_action"
                  value="include_in_budget"
                  checked={incomeAction === "include_in_budget"}
                  onChange={() => setIncomeAction("include_in_budget")}
                />
                Include in Budget
              </label>
              <label className="flex items-center gap-1.5 text-foreground">
                <input
                  type="radio"
                  name="income_action"
                  value="add_to_source"
                  checked={incomeAction === "add_to_source"}
                  onChange={() => setIncomeAction("add_to_source")}
                />
                Add to Source
              </label>
              <label className="flex items-center gap-1.5 text-foreground">
                <input
                  type="radio"
                  name="income_action"
                  value="create_source"
                  checked={incomeAction === "create_source"}
                  onChange={() => setIncomeAction("create_source")}
                />
                Create a Source
              </label>
            </div>
          </fieldset>

          {incomeAction === "add_to_source" && (
            <label className={fieldLabel}>
              Source
              <Select name="source_id" uiSize="sm" className="w-36" placeholder="Choose a source">
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
            <>
              <label className={fieldLabel}>
                New source name
                <input
                  type="text"
                  name="new_source_name"
                  required
                  placeholder="e.g. Bonus"
                  className={`w-36 ${fieldInput}`}
                />
              </label>
              <label className={fieldLabel}>
                Source type
                <Select name="new_source_type" uiSize="sm" className="w-36" defaultValue="past_payment">
                  <option value="past_payment">Past payment</option>
                  <option value="future_repayment">Future repayment</option>
                </Select>
              </label>
            </>
          )}
        </>
      )}

      {typeChoice === "transfer" && (
        <>
          <label className={fieldLabel}>
            Transfer from (optional)
            <Select name="transfer_from" uiSize="sm" className="w-40" defaultValue="" placeholder="None">
              <option value="">None</option>
              {bucketOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          </label>
          <label className={fieldLabel}>
            Transfer to (optional)
            <Select name="transfer_to" uiSize="sm" className="w-40" defaultValue="" placeholder="None">
              <option value="">None</option>
              {bucketOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          </label>
        </>
      )}

      {typeChoice === "exclude" && (
        <p className="max-w-xs pb-2 text-xs text-muted">
          Disregarded entirely — no category, source, or budget tracking.
        </p>
      )}

      <Button type="submit" variant="accent" size="icon" aria-label="Add transaction">
        <AddIcon />
      </Button>
    </form>
  );
}

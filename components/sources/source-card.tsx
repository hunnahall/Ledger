"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { getSourcesWithBalance } from "@/lib/queries/sources";
import { archiveSource, deleteSource, renameSource, setSourceBalance } from "@/lib/actions/sources";
import { formatDate, formatMoney } from "@/lib/format";
import { stepAmountByDollar } from "@/lib/dollar-step";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { RowMenu, type RowMenuItem } from "@/components/ui/row-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useModal } from "@/components/ui/modal";
import { SOURCE_TYPE_LABELS as TYPE_LABELS } from "@/lib/sources/validate-source";
import { cn } from "@/lib/cn";

type Source = Awaited<ReturnType<typeof getSourcesWithBalance>>[number];
type FormAction = (prev: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>;

// One Source: name and type, its balance, and this month's change. The
// whole card opens Transactions filtered to the Source (a stretched link);
// every edit lives in the ⋯ menu.
export function SourceCard({
  source,
  monthChange,
  decimalPlaces,
}: {
  source: Source;
  monthChange: number;
  decimalPlaces: number;
}) {
  const { confirm, dialog } = useConfirm();
  const { open, close, modal } = useModal();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(action: FormAction) {
    startTransition(async () => {
      const result = await action(null, new FormData());
      setError(result?.error ?? null);
    });
  }

  async function handleDelete() {
    const ok = await confirm(`Delete "${source.name}"? This can't be undone.`, {
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) run(deleteSource.bind(null, source.id));
  }

  const items: RowMenuItem[] = [
    {
      label: "Rename",
      onSelect: () =>
        open(
          <FieldDialog
            title={`Rename ${source.name}`}
            action={renameSource.bind(null, source.id)}
            onDone={close}
            field={<Input type="text" name="name" defaultValue={source.name} required autoFocus aria-label="Name" />}
          />,
        ),
    },
    {
      label: "Edit balance",
      onSelect: () =>
        open(
          <FieldDialog
            title={`Edit ${source.name} balance`}
            action={setSourceBalance.bind(null, source.id)}
            onDone={close}
            field={
              <Input
                type="number"
                name="amount"
                step="0.01"
                defaultValue={source.balance}
                onKeyDown={stepAmountByDollar}
                autoFocus
                aria-label="Balance"
              />
            }
          />,
        ),
    },
    ...(!source.is_system
      ? [
          { label: "Archive", onSelect: () => run(archiveSource.bind(null, source.id)), destructive: true },
          { label: "Delete", onSelect: handleDelete, destructive: true },
        ]
      : []),
  ];

  return (
    <Card interactive className="relative flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={`/transactions?source_id=${source.id}`}
            className="truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
          >
            {source.name}
          </Link>
          <Tag>{TYPE_LABELS[source.type] ?? source.type}</Tag>
        </div>
        <RowMenu items={items} label={`Actions for ${source.name}`} className="relative z-10 -mr-2 -mt-1" />
      </div>
      <Money
        amount={source.balance}
        decimalPlaces={decimalPlaces}
        className="text-[28px] font-semibold leading-tight"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-muted tabular-nums">
        <span>
          {monthChange === 0 ? "No change" : `${monthChange > 0 ? "+" : ""}${formatMoney(monthChange, decimalPlaces)}`}{" "}
          this month
        </span>
        {source.type === "reimbursement" && source.deposit_date && (
          <span>Deposit {formatDate(source.deposit_date)}</span>
        )}
      </div>
      {error && <p className="relative z-10 text-xs text-danger">{error}</p>}
      {dialog}
      {modal}
    </Card>
  );
}

function FieldDialog({
  title,
  action,
  field,
  onDone,
}: {
  title: string;
  action: FormAction;
  field: React.ReactNode;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: { error: string } | null, formData: FormData) => {
    const result = await action(prev, formData);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {field}
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className={cn("flex justify-end gap-2")}>
        <Button type="button" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}

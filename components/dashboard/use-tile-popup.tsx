"use client";

import { useCallback } from "react";
import { useModal } from "@/components/ui/modal";
import { TransactionsPopupList } from "@/components/dashboard/transactions-popup-list";
import type { DashboardTileKind } from "@/lib/actions/dashboard-transactions";

// Every clickable figure on the Dashboard opens the same read-only list of
// the transactions behind it. One hook so each card wires that up the same
// way; `modal` must be rendered by the card.
export function useTilePopup(months: string[], decimalPlaces: number) {
  const { open, modal } = useModal();
  const openTile = useCallback(
    (title: string, kind: DashboardTileKind, only: string[] = months) =>
      open(<TransactionsPopupList title={title} kind={kind} months={only} decimalPlaces={decimalPlaces} />),
    [open, months, decimalPlaces],
  );
  return { openTile, modal };
}

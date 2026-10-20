// Shared by the split editor (split-editor.tsx renders this many rows) and
// saveSplits (lib/actions/transactions.ts reads them back), and enforced by
// save_transaction_splits in the database.
export const MAX_SPLIT_ROWS = 4;

export type SplitPiece = {
  id: string;
  parentId: string;
  parentAmount: number;
  amount: number;
  sourceId: string | null;
  categoryId: string | null;
  excluded: boolean;
  notes: string | null;
};

export type SplitGroup = { parentId: string; parentAmount: number; pieces: SplitPiece[] };

// Groups split pieces by their original, keeping the order they arrive in
// (creation order, which is the order they were entered in the editor).
export function buildSplitGroups(pieces: SplitPiece[]): Map<string, SplitGroup> {
  const groups = new Map<string, SplitGroup>();
  for (const piece of pieces) {
    let group = groups.get(piece.parentId);
    if (!group) {
      group = { parentId: piece.parentId, parentAmount: piece.parentAmount, pieces: [] };
      groups.set(piece.parentId, group);
    }
    group.pieces.push(piece);
  }
  return groups;
}

export type SplitRowInput = {
  amount: number;
  sourceId: string | null;
  categoryId: string | null;
  exclude: boolean;
  notes: string;
};

// The same checks save_transaction_splits makes, run before the round trip
// so the editor can say what's wrong. No rows at all means "remove the
// split". A category only applies to a Budget-sourced piece (as on a row),
// so it's dropped from any other piece rather than rejected.
export function validateSplitRows(
  parentAmount: number,
  rows: SplitRowInput[],
  budgetSourceId: string | null,
): { rows: SplitRowInput[] } | { error: string } {
  const filled = rows
    .filter((r) => r.amount !== 0)
    .map((r) => ({
      ...r,
      sourceId: r.exclude ? null : r.sourceId,
      categoryId: !r.exclude && r.sourceId !== null && r.sourceId === budgetSourceId ? r.categoryId : null,
    }));
  if (filled.length === 0) return { rows: [] };
  if (filled.length === 1) return { error: "A split needs at least 2 pieces." };
  if (filled.length > MAX_SPLIT_ROWS) return { error: `A split can have at most ${MAX_SPLIT_ROWS} pieces.` };
  const totalCents = filled.reduce((sum, r) => sum + Math.round(r.amount * 100), 0);
  if (totalCents !== Math.round(parentAmount * 100)) {
    const left = (Math.round(parentAmount * 100) - totalCents) / 100;
    return { error: `The pieces must add up to the transaction. ${left.toFixed(2)} is left to assign.` };
  }
  return { rows: filled };
}

// One color per Source, shared by Source Allocation and the money map, so a
// Source wears the same color on both and keeps it month to month. Color
// follows the Source's place in a fixed order (system Sources first, then
// the rest oldest first), never how much it spent.

export type ChartTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** --chart-1..12 (the Covenant Works chart palette). Any Source past the twelfth is grouped as Other in --fg-3. */
export const MAX_TONES = 12;

const SYSTEM_ORDER = ["budget", "income", "sinking_fund", "float"];

export type ToneSource = {
  id: string;
  type: string | null;
  isSystem: boolean;
  createdAt: string;
};

/** Sources in their stable display order. */
export function orderSources<T extends ToneSource>(sources: T[]): T[] {
  const rank = (s: ToneSource) => {
    if (!s.isSystem) return SYSTEM_ORDER.length;
    const i = SYSTEM_ORDER.indexOf(s.type ?? "");
    return i === -1 ? SYSTEM_ORDER.length - 0.5 : i;
  };
  return [...sources].sort(
    (a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

/** Each Source's tone, or null when it falls into Other. */
export function sourceTones(sources: ToneSource[]): Map<string, ChartTone | null> {
  return new Map(
    orderSources(sources).map((s, i) => [s.id, i < MAX_TONES ? ((i + 1) as ChartTone) : null]),
  );
}

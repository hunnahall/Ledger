// The Dashboard's tiles: which charts show, in what order, and how wide.
// Saved per user in settings.dashboard_layout. Widths are column spans on a
// 6-column grid (2 = a third, 3 = a half, 4 = two thirds, 6 = full width);
// narrower screens collapse them (see components/dashboard/dashboard-grid.tsx).

export const TILE_IDS = [
  "money-map",
  "budget-net",
  "cash-flow",
  "daily-spending",
  "source-allocation",
  "heatmap",
  "category-spending",
  "budget-funding",
  "float",
  "by-month",
] as const;

export type TileId = (typeof TILE_IDS)[number];

export const TILE_LABELS: Record<TileId, string> = {
  "money-map": "Money Map",
  "budget-net": "Budget Net",
  "cash-flow": "Cash Flow",
  "daily-spending": "Daily Spending",
  "source-allocation": "Source Allocation",
  heatmap: "Spending by Day",
  "category-spending": "Spending by Category",
  "budget-funding": "Budget Funding",
  float: "Float",
  "by-month": "By Month",
};

export const GRID_COLUMNS = 6;
export const MIN_SPAN = 2;

export type TileLayout = { id: TileId; span: number };
export type DashboardLayout = { tiles: TileLayout[]; hidden: TileId[] };

export const DEFAULT_LAYOUT: DashboardLayout = {
  tiles: [
    { id: "money-map", span: 6 },
    { id: "budget-net", span: 4 },
    { id: "cash-flow", span: 2 },
    { id: "daily-spending", span: 4 },
    { id: "source-allocation", span: 2 },
    { id: "heatmap", span: 6 },
    { id: "category-spending", span: 4 },
    { id: "budget-funding", span: 2 },
    { id: "by-month", span: 4 },
    { id: "float", span: 2 },
  ],
  hidden: [],
};

const isTileId = (value: unknown): value is TileId => TILE_IDS.includes(value as TileId);

export function clampSpan(span: number): number {
  return Math.min(GRID_COLUMNS, Math.max(MIN_SPAN, Math.round(span)));
}

/**
 * A saved layout made safe to use: unknown or repeated tiles dropped, spans
 * kept in range, and any tile added since it was saved put back at its
 * default width at the end. Anything unreadable is the default layout.
 */
export function normalizeLayout(raw: unknown): DashboardLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAYOUT;
  const { tiles, hidden } = raw as { tiles?: unknown; hidden?: unknown };
  if (!Array.isArray(tiles)) return DEFAULT_LAYOUT;

  const seen = new Set<TileId>();
  const out: TileLayout[] = [];
  for (const t of tiles) {
    const id = (t as { id?: unknown })?.id;
    const span = Number((t as { span?: unknown })?.span);
    if (!isTileId(id) || seen.has(id) || !Number.isFinite(span)) continue;
    seen.add(id);
    out.push({ id, span: clampSpan(span) });
  }
  for (const t of DEFAULT_LAYOUT.tiles) if (!seen.has(t.id)) out.push(t);

  const hiddenIds = Array.isArray(hidden) ? [...new Set(hidden.filter(isTileId))] : [];
  return { tiles: out, hidden: hiddenIds };
}

/**
 * Moves the tile `id` next to `overId`. `after` says which side: true puts it
 * right after, false right before. Left out, it lands where `overId` sat (so
 * a tile moved down goes after, one moved up goes before).
 */
export function moveTile(layout: DashboardLayout, id: TileId, overId: TileId, after?: boolean): DashboardLayout {
  const from = layout.tiles.findIndex((t) => t.id === id);
  const to = layout.tiles.findIndex((t) => t.id === overId);
  if (from === -1 || to === -1 || from === to) return layout;
  const tiles = [...layout.tiles];
  const [tile] = tiles.splice(from, 1);
  const overIndex = tiles.findIndex((t) => t.id === overId);
  tiles.splice(after === undefined ? to : overIndex + (after ? 1 : 0), 0, tile);
  return { ...layout, tiles };
}

export function resizeTile(layout: DashboardLayout, id: TileId, span: number): DashboardLayout {
  return { ...layout, tiles: layout.tiles.map((t) => (t.id === id ? { ...t, span: clampSpan(span) } : t)) };
}

export function setTileVisible(layout: DashboardLayout, id: TileId, visible: boolean): DashboardLayout {
  const hidden = visible ? layout.hidden.filter((h) => h !== id) : [...new Set([...layout.hidden, id])];
  return { ...layout, hidden };
}

export function showAllTiles(layout: DashboardLayout): DashboardLayout {
  return { ...layout, hidden: [] };
}

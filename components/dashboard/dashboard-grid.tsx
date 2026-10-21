"use client";

import { useEffect, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type UniqueIdentifier,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveDashboardLayout } from "@/lib/actions/settings";
import {
  DEFAULT_LAYOUT,
  GRID_COLUMNS,
  TILE_LABELS,
  moveTile,
  resizeTile,
  setTileVisible,
  type DashboardLayout,
  type TileId,
} from "@/lib/dashboard-layout";
import { Button } from "@/components/ui/button";
import { GripIcon, HideIcon, LayoutIcon, ResizeIcon } from "@/components/ui/icons";
import { ChartsMenu } from "@/components/dashboard/charts-menu";
import { cn } from "@/lib/cn";

// Where a dragged tile lands. The tile under the pointer wins. Over empty
// space in a row (a free third beside a two-thirds tile), the tile in that row
// nearest the pointer wins. Anywhere else, the closest center decides.
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  if (within.length > 0) return within;
  const { x, y } = args.pointerCoordinates ?? {};
  if (x !== undefined && y !== undefined) {
    let best: { id: UniqueIdentifier; distance: number } | null = null;
    for (const container of args.droppableContainers) {
      const rect = args.droppableRects.get(container.id);
      if (!rect || y < rect.top || y > rect.top + rect.height) continue;
      const distance = x < rect.left ? rect.left - x : x - (rect.left + rect.width);
      if (!best || distance < best.distance) best = { id: container.id, distance };
    }
    if (best) return [{ id: best.id }];
  }
  return closestCenter(args);
};

/** Gap between tiles, px (gap-4). */
const GAP = 16;

const SIZES: { span: number; label: string; name: string }[] = [
  { span: 2, label: "⅓", name: "A third" },
  { span: 3, label: "½", name: "Half" },
  { span: 4, label: "⅔", name: "Two thirds" },
  { span: 6, label: "Full", name: "Full width" },
];

// Column span per screen width: 6 columns from 1280px (every width
// available), 2 from 640px (a tile two thirds or wider takes the row), and
// one below that.
function spanClass(span: number) {
  const wide = {
    2: "min-[1280px]:col-span-2",
    3: "min-[1280px]:col-span-3",
    4: "min-[1280px]:col-span-4",
    5: "min-[1280px]:col-span-5",
    6: "min-[1280px]:col-span-6",
  }[span];
  return cn(span >= 4 ? "min-[640px]:col-span-2" : "min-[640px]:col-span-1", wide);
}

// The Dashboard's charts as tiles. Normally they just sit in the grid. Edit
// layout turns on the tools: drag a tile by its grip (or focus the grip and
// use the arrow keys) to move it, drag its right edge or pick a width to
// resize it, and hide it. The Charts menu picks which tiles show. Every
// change is saved to the user's settings a moment after it's made.
export function DashboardGrid({
  title,
  controls,
  tiles,
  initialLayout,
}: {
  title: ReactNode;
  /** Shown before the Charts menu, top right (the month picker). */
  controls: ReactNode;
  tiles: Record<TileId, ReactNode>;
  initialLayout: DashboardLayout;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startSave] = useTransition();
  const firstRender = useRef(true);
  const gridRef = useRef<HTMLDivElement>(null);

  // Save shortly after the last change, so a drag or a run of clicks is one
  // write.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      startSave(async () => {
        const result = await saveDashboardLayout(layout);
        setSaveError(result?.error ?? null);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [layout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visible = layout.tiles.filter((t) => !layout.hidden.includes(t.id));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    // Level with the tile it was dropped on (the same row), the dragged
    // tile's side of that tile's center decides before or after. Dropped
    // above or below it, the tile takes that tile's place.
    const dragged = active.rect.current.translated;
    const level =
      dragged && dragged.top + dragged.height / 2 >= over.rect.top && dragged.top + dragged.height / 2 <= over.rect.top + over.rect.height;
    const after = dragged && level ? dragged.left + dragged.width / 2 > over.rect.left + over.rect.width / 2 : undefined;
    setLayout((l) => moveTile(l, active.id as TileId, over.id as TileId, after));
  }

  /** One column's width plus a gap, in px: what a resize drag snaps to. */
  function columnStep() {
    const width = gridRef.current?.clientWidth ?? 0;
    return (width - GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS + GAP;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        {title}
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          <ChartsMenu layout={layout} onChange={setLayout} onReset={() => setLayout(DEFAULT_LAYOUT)} />
          <Button
            type="button"
            size="sm"
            variant={editing ? "primary" : "secondary"}
            aria-pressed={editing}
            onClick={() => setEditing((e) => !e)}
          >
            <LayoutIcon size={16} />
            {editing ? "Done" : "Edit layout"}
          </Button>
        </div>
      </div>

      {editing && (
        <p className="text-xs text-muted">
          Drag a tile by its grip to move it. Drag its right edge or pick a width to resize it. Pick which charts show
          from Charts.
        </p>
      )}
      {saveError && <p className="text-xs text-danger">Couldn&apos;t save the layout: {saveError}</p>}

      {visible.length === 0 ? (
        <p className="border border-border bg-surface p-5 text-sm text-muted">
          No charts shown. Pick some from Charts, top right.
        </p>
      ) : (
        <DndContext id="dashboard-grid" sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div ref={gridRef} className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1280px]:grid-cols-6">
              {visible.map((t) => (
                <Tile
                  key={t.id}
                  id={t.id}
                  span={t.span}
                  editing={editing}
                  columnStep={columnStep}
                  onResize={(span) => setLayout((l) => resizeTile(l, t.id, span))}
                  onHide={() => setLayout((l) => setTileVisible(l, t.id, false))}
                >
                  {tiles[t.id]}
                </Tile>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function Tile({
  id,
  span,
  editing,
  columnStep,
  onResize,
  onHide,
  children,
}: {
  id: TileId;
  span: number;
  editing: boolean;
  columnStep: () => number;
  onResize: (span: number) => void;
  onHide: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  const label = TILE_LABELS[id];

  // Dragging the right edge: the new width snaps to whole columns.
  function startResize(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const step = columnStep();
    if (step <= 0) return;
    const move = (ev: PointerEvent) => onResize(span + Math.round((ev.clientX - startX) / step));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex min-w-0 flex-col",
        spanClass(span),
        isDragging && "z-10 opacity-80 shadow-overlay",
      )}
    >
      {editing && (
        <div className="flex items-center gap-1 border border-b-0 border-dashed border-border-strong bg-surface-2 px-1.5 py-1">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Move ${label}. Use the arrow keys, then Space to drop.`}
            className="flex h-7 cursor-grab touch-none items-center gap-1.5 px-1.5 text-xs text-foreground-secondary hover:bg-fill-hover active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripIcon size={16} />
            <span className="truncate font-mono text-[11px] uppercase tracking-[0.08em]">{label}</span>
          </button>
          <div role="group" aria-label={`${label} width`} className="ml-auto flex">
            {SIZES.map((s) => (
              <button
                key={s.span}
                type="button"
                aria-pressed={span === s.span}
                aria-label={s.name}
                title={s.name}
                onClick={() => onResize(s.span)}
                className={cn(
                  "h-7 min-w-7 px-1.5 text-xs transition-colors duration-[120ms] ease-standard",
                  span === s.span ? "bg-fill-active font-medium text-foreground" : "text-foreground-secondary hover:bg-fill-hover",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onHide}
            aria-label={`Hide ${label}`}
            title="Hide"
            className="flex size-7 items-center justify-center text-foreground-secondary hover:bg-fill-hover hover:text-foreground"
          >
            <HideIcon size={16} />
          </button>
        </div>
      )}
      <div className={cn("grid flex-1 [&>*]:min-w-0", editing && "pointer-events-none select-none")}>{children}</div>
      {editing && (
        <button
          type="button"
          aria-label={`Resize ${label}. Use the left and right arrow keys.`}
          title="Drag to resize"
          onPointerDown={startResize}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              onResize(span + (e.key === "ArrowRight" ? 1 : -1));
            }
          }}
          className="absolute -right-2 bottom-1/2 z-10 hidden h-10 w-4 translate-y-1/2 cursor-ew-resize touch-none items-center justify-center border border-border-strong bg-surface-2 text-foreground-secondary shadow-overlay hover:text-foreground min-[1280px]:flex"
        >
          <ResizeIcon size={12} />
        </button>
      )}
    </div>
  );
}

"use client";

import { type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { useAnchoredPopover } from "@/components/ui/use-anchored-popover";
import {
  TILE_IDS,
  TILE_LABELS,
  setTileVisible,
  showAllTiles,
  type DashboardLayout,
  type TileId,
} from "@/lib/dashboard-layout";

const MENU_WIDTH = 232;

// Which charts the Dashboard shows: a checkbox per chart, Show all, and Reset
// layout. It stays open while charts are ticked on and off.
export function ChartsMenu({
  layout,
  onChange,
  onReset,
}: {
  layout: DashboardLayout;
  onChange: (layout: DashboardLayout) => void;
  onReset: () => void;
}) {
  const { open, setOpen, openPanel, placement, panelStyle, triggerRef, panelRef } = useAnchoredPopover<
    HTMLButtonElement,
    HTMLDivElement
  >({ estimatedHeight: TILE_IDS.length * 32 + 96, maxWidth: MENU_WIDTH, alignEnd: true });
  const shown = TILE_IDS.length - layout.hidden.length;
  const isShown = (id: TileId) => !layout.hidden.includes(id);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const item = "flex h-8 w-full items-center gap-2.5 px-3 text-left hover:bg-fill-hover focus-visible:bg-fill-hover focus-visible:outline-none";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        className={cn(
          "inline-flex h-[var(--control-sm)] items-center gap-1.5 border border-border bg-surface px-2.5 text-[13px] text-foreground-secondary",
          "transition-colors duration-[120ms] ease-standard hover:border-border-strong hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          open && "border-border-strong text-foreground",
        )}
      >
        Charts
        <span className="font-mono text-[11px] text-muted tabular-nums">
          {shown === TILE_IDS.length ? "All" : `${shown}/${TILE_IDS.length}`}
        </span>
        <ChevronDownIcon size={14} className={cn("transition-transform duration-[120ms]", open && "rotate-180")} />
      </button>
      {open &&
        placement &&
        createPortal(
          <div
            ref={panelRef}
            role="group"
            aria-label="Charts shown"
            onKeyDown={onKeyDown}
            className={cn(
              "fixed z-50 border border-border-strong bg-surface-2 py-1 text-sm shadow-popover",
              "transition-[opacity,transform] duration-[120ms] ease-entrance",
              "translate-y-0 opacity-100 starting:-translate-y-1 starting:opacity-0",
            )}
            style={{ ...panelStyle, width: MENU_WIDTH }}
          >
            <button
              type="button"
              disabled={layout.hidden.length === 0}
              onClick={() => onChange(showAllTiles(layout))}
              className={cn(item, "font-medium disabled:text-muted disabled:hover:bg-transparent")}
            >
              Show all
            </button>
            <div role="separator" className="my-1 h-px bg-border" />
            {TILE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="checkbox"
                aria-checked={isShown(id)}
                onClick={() => onChange(setTileVisible(layout, id, !isShown(id)))}
                className={item}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-4 flex-none items-center justify-center border",
                    isShown(id) ? "border-accent bg-accent text-on-accent" : "border-border-strong",
                  )}
                >
                  {isShown(id) && <CheckIcon size={12} />}
                </span>
                {TILE_LABELS[id]}
              </button>
            ))}
            <div role="separator" className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className={cn(item, "text-foreground-secondary")}
            >
              Reset layout
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

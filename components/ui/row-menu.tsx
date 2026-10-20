"use client";

import { useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { MoreIcon } from "@/components/ui/icons";
import { useAnchoredPopover } from "@/components/ui/use-anchored-popover";

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  /** Destructive items are listed last, after a separator, in danger text. */
  destructive?: boolean;
  disabled?: boolean;
};

const MENU_WIDTH = 192;

// The ⋯ menu for a row or card: the actions that don't earn a button of
// their own. A Level 2 popover anchored to the trigger's right edge.
export function RowMenu({
  items,
  label = "More actions",
  className,
}: {
  items: RowMenuItem[];
  label?: string;
  className?: string;
}) {
  const ordered = [...items.filter((i) => !i.destructive), ...items.filter((i) => i.destructive)];
  const firstDestructive = ordered.findIndex((i) => i.destructive);
  const [highlighted, setHighlighted] = useState(0);
  const { open, setOpen, openPanel, placement, panelStyle, triggerRef, panelRef } =
    useAnchoredPopover<HTMLButtonElement, HTMLDivElement>({
      estimatedHeight: ordered.length * 32 + 16,
      maxWidth: MENU_WIDTH,
      alignEnd: true,
    });

  function choose(item: RowMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    item.onSelect();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setHighlighted(0);
      openPanel();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, ordered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = ordered[highlighted];
      if (item) choose(item);
    } else if (event.key === "Escape") {
      // Keeps a surrounding dialog from closing too.
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          // Row menus often sit inside a clickable card or row.
          e.stopPropagation();
          e.preventDefault();
          if (open) setOpen(false);
          else {
            setHighlighted(0);
            openPanel();
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex size-[var(--control-sm)] shrink-0 items-center justify-center text-muted",
          "transition-colors duration-[120ms] ease-standard hover:bg-fill-hover hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          open && "bg-fill-active text-foreground",
          className,
        )}
      >
        <MoreIcon size={16} />
      </button>
      {open &&
        placement &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "fixed z-50 border border-border-strong bg-surface-2 py-1 text-sm shadow-popover",
              "transition-[opacity,transform] duration-[120ms] ease-entrance",
              "opacity-100 translate-y-0 starting:opacity-0 starting:-translate-y-1",
            )}
            style={{ ...panelStyle, width: MENU_WIDTH }}
          >
            {ordered.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                {index === firstDestructive && index > 0 && (
                  <div role="separator" className="my-1 h-px bg-border" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex h-8 w-full items-center px-3 text-left disabled:opacity-40",
                    index === highlighted && "bg-fill-hover",
                    item.destructive && "text-danger",
                  )}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

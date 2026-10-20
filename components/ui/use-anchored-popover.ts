"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Placement = { top: number; left: number; width: number; openUp: boolean };

interface Options {
  /** Expected panel height, used to decide whether it fits below the trigger. */
  estimatedHeight: number;
  /** The widest the panel can grow. Used to keep it inside the viewport. */
  maxWidth?: number;
  /** Line the panel's right edge up with the trigger's right edge (row menus). */
  alignEnd?: boolean;
}

// Positioning and dismissal shared by Select and RowMenu: a panel portaled
// to <body> at fixed coordinates next to its trigger. It flips upward when
// there's no room below, stays 8px inside the viewport, and closes on an
// outside pointer, an outside scroll (the coordinates would go stale) or a
// resize. Escape is left to the caller, since Select and RowMenu each need
// to return focus their own way.
export function useAnchoredPopover<T extends HTMLElement, P extends HTMLElement>({
  estimatedHeight,
  maxWidth = 320,
  alignEnd = false,
}: Options) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<P>(null);

  function openPanel() {
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const openUp = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
      const panelWidth = Math.max(rect.width, maxWidth);
      const preferred = alignEnd ? rect.right - panelWidth : rect.left;
      const left = Math.min(preferred, window.innerWidth - panelWidth - 8);
      setPlacement({
        top: openUp ? rect.top : rect.bottom,
        left: Math.max(8, left),
        width: rect.width,
        openUp,
      });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll(event: Event) {
      // Scrolling inside the panel itself must not close it.
      const target = event.target;
      if (panelRef.current && target instanceof Node && panelRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function handleResize() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const panelStyle: CSSProperties | undefined = placement
    ? {
        left: placement.left,
        minWidth: placement.width,
        ...(placement.openUp
          ? { bottom: window.innerHeight - placement.top }
          : { top: placement.top }),
      }
    : undefined;

  return { open, setOpen, openPanel, placement, panelStyle, triggerRef, panelRef };
}

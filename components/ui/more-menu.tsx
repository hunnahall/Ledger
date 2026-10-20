"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MORE_LINKS } from "./nav-links";
import { MoreIcon } from "./icons";
import { SidebarLink, isActivePath } from "./sidebar-link";
import { cn } from "@/lib/cn";

// The "..." menu holding Log, Rules and Settings. A Level 2 popover that
// opens upward from the navigation's foot.
export function MoreMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hereInMore = MORE_LINKS.some((l) => isActivePath(pathname, l.href));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex h-[var(--control-md)] w-full items-center gap-3 px-3 text-[13px] font-medium transition-colors duration-[120ms] ease-standard",
          hereInMore || open
            ? "bg-fill-active text-foreground"
            : "text-foreground-secondary hover:bg-fill-hover hover:text-foreground",
        )}
      >
        <MoreIcon size={16} className="shrink-0 text-muted" />
        <span>More</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full z-[40] mb-1 border border-border-strong bg-surface-2 py-1 shadow-popover"
        >
          {MORE_LINKS.map((link) => (
            <SidebarLink
              key={link.href}
              {...link}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

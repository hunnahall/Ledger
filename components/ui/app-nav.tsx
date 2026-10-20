"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LedgerMark } from "./mark";
import { ALL_LINKS } from "./nav-links";
import { MenuIcon, CloseIcon } from "./icons";
import { NavColumn, BrandHeader } from "./sidebar";
import { isActivePath } from "./sidebar-link";

// 640 to 999px (and phones): the sidebar collapses to a top bar with the
// logo, the page title and a menu button that opens navigation as a Level 2
// sheet from the left.
export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = ALL_LINKS.find((l) => isActivePath(pathname, l.href))?.label ?? "";

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="min-[1000px]:hidden">
      <header className="sticky top-0 z-[10] flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
        <LedgerMark size={24} className="shrink-0" />
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.015em]">{title}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex size-[var(--control-lg)] items-center justify-center text-foreground-secondary hover:text-foreground"
        >
          <MenuIcon size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-[var(--scrim)] opacity-100 transition-opacity duration-[200ms] starting:opacity-0"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[min(var(--sidebar-w),85vw)] translate-x-0 flex-col border-r border-border-strong bg-surface-2 shadow-overlay transition-transform duration-[200ms] ease-entrance starting:-translate-x-full"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <BrandHeader />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex size-[var(--control-md)] items-center justify-center text-foreground-secondary hover:text-foreground"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <NavColumn onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}

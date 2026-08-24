"use client";

import { useState, type ReactNode } from "react";
import { LedgerMark } from "./mark";
import { NavLink } from "./nav-link";
import { NAV_LINKS } from "./nav-links";

// Mobile-only nav (Ledger mark toggles a dropdown) — md+ uses the persistent
// Sidebar instead, so this renders nothing there.
export function AppNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 text-foreground transition-transform duration-150 hover:scale-105 active:scale-95 md:hidden"
      >
        <LedgerMark size={32} />
        <p className="text-2xl font-semibold tracking-tight">Ledger</p>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-card-border bg-surface shadow-elevated md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} {...link} onClick={() => setOpen(false)} />
            ))}
            {children}
          </nav>
        </div>
      )}
    </>
  );
}

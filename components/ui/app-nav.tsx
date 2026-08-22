"use client";

import { useState, type ReactNode } from "react";
import { NavLink } from "./nav-link";
import { NAV_LINKS } from "./nav-links";

export function AppNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
        {children}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="rounded-md p-2 text-foreground transition-transform duration-150 hover:scale-110 active:scale-95 md:hidden"
      >
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <>
              <path d="M6 6 L18 18" />
              <path d="M18 6 L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7 H20" />
              <path d="M4 12 H20" />
              <path d="M4 17 H20" />
            </>
          )}
        </svg>
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

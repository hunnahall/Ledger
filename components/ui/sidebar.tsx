"use client";

import { useSyncExternalStore } from "react";
import { LedgerMark } from "./mark";
import { SidebarLink } from "./sidebar-link";
import { NAV_LINKS } from "./nav-links";
import { ChevronDownIcon, LogOutIcon, SearchIcon } from "./icons";
import { PALETTE_OPEN_EVENT } from "./command-palette";
import { signOut } from "@/lib/actions/auth";

// Dividers are anchored to specific hrefs (rather than array indices) so
// they can't silently drift to the wrong spot if NAV_LINKS is ever
// reordered.
const DIVIDER_AFTER = new Set(["/dashboard", "/sources"]);

// Same shape as the theme preference (see components/ui/theme-toggle.tsx):
// localStorage is the store, a custom event is the subscription, and the
// server snapshot is the expanded default so hydration matches.
const STORAGE_KEY = "ledger-sidebar-collapsed";
const COLLAPSE_EVENT = "ledger-sidebar-change";

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode or blocked storage: stay expanded.
    return false;
  }
}

function getServerCollapsed() {
  return false;
}

function subscribe(callback: () => void) {
  window.addEventListener(COLLAPSE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function Sidebar() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, getServerCollapsed);

  function toggleCollapsed() {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    } catch {
      // Preference just won't survive the reload.
    }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }

  return (
    <aside
      className={`hidden shrink-0 border-r border-border bg-surface transition-[width] duration-[160ms] ease-standard md:sticky md:top-0 md:flex md:h-dvh md:flex-col ${
        collapsed ? "md:w-[76px]" : "md:w-44"
      }`}
    >
      {/* The wordmark is always horizontal (mark + text side by side), never
          stacked — left-aligned 24px in when expanded to line up with the
          nav icons below (see SidebarLink). Collapsed, the mark stays
          centered on that same axis as the nav icons (verified: both sit at
          the sidebar's exact horizontal center) with the toggle moved below
          it rather than beside it — beside would've pushed the mark off
          that shared center. */}
      <div
        className={`flex shrink-0 items-center border-b border-border text-foreground ${
          collapsed ? "flex-col justify-center gap-1 py-4" : "justify-between py-6 pl-6 pr-3"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "" : "min-w-0 gap-2.5"}`}>
          <LedgerMark size={26} className="shrink-0" />
          {!collapsed && (
            <p className="whitespace-nowrap text-xl font-semibold tracking-tight">Ledger</p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 rounded-sm p-1 text-muted transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 hover:text-foreground"
        >
          <ChevronDownIcon size={14} className={collapsed ? "-rotate-90" : "rotate-90"} />
        </button>
      </div>

      {/* The palette itself is mounted once in the (app) layout; this just
          asks it to open, and advertises the shortcut for anyone who hasn't
          found it. */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(PALETTE_OPEN_EVENT))}
          title="Search (⌘K)"
          aria-label="Open command palette"
          className={`flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-muted transition-colors duration-[120ms] ease-standard hover:border-border-strong hover:text-foreground ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <SearchIcon size={16} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate">Search</span>
              <kbd className="ml-auto rounded-sm border border-border px-1 py-0.5 font-sans text-[0.625rem] text-muted">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-3">
        {NAV_LINKS.map((link) => (
          <div key={link.href}>
            <SidebarLink {...link} collapsed={collapsed} />
            {DIVIDER_AFTER.has(link.href) && <hr className="mx-3 my-2 border-border" />}
          </div>
        ))}

        <hr className="mx-3 my-2 border-border" />

        {/* px-3 here (rather than mx-3 on the button) because a <button>,
            unlike the <a> in SidebarLink, doesn't fill a block parent's
            width on its own even when blockified by `flex` — w-full needs
            an explicit width to fill instead of a margin to fill around. */}
        <form action={signOut} className="px-3">
          <button
            type="submit"
            title={collapsed ? "Log out" : undefined}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 hover:text-foreground ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOutIcon size={18} className="shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </form>
      </nav>
    </aside>
  );
}

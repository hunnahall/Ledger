"use client";

import { useState } from "react";
import { LedgerMark } from "./mark";
import { SidebarLink } from "./sidebar-link";
import { NAV_LINKS } from "./nav-links";
import { ChevronDownIcon, LogOutIcon } from "./icons";
import { signOut } from "@/lib/actions/auth";

// Dividers are anchored to specific hrefs (rather than array indices) so
// they can't silently drift to the wrong spot if NAV_LINKS is ever
// reordered.
const DIVIDER_AFTER = new Set(["/dashboard", "/sources"]);

export function Sidebar() {
  // Not persisted beyond this mount: the (app) layout stays mounted across
  // client-side navigation between its pages, so this already survives
  // normal in-app browsing — it only resets on a full page reload.
  const [collapsed, setCollapsed] = useState(false);

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  return (
    <aside
      className={`hidden shrink-0 border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-dvh md:flex-col ${
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
          className="shrink-0 rounded p-1 text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-foreground"
        >
          <ChevronDownIcon size={14} className={collapsed ? "-rotate-90" : "rotate-90"} />
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
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-foreground ${
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

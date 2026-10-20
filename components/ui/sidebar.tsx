"use client";

import { LedgerMark, CovenantMark } from "./mark";
import { SidebarLink } from "./sidebar-link";
import { MoreMenu } from "./more-menu";
import { NAV_LINKS } from "./nav-links";
import { LogOutIcon, SearchIcon } from "./icons";
import { PALETTE_OPEN_EVENT } from "./command-palette";
import { signOut } from "@/lib/actions/auth";

// The navigation column shared by the fixed sidebar (1000px and up) and the
// sheet that opens from the top bar below that width.
export function NavColumn({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            window.dispatchEvent(new Event(PALETTE_OPEN_EVENT));
          }}
          title="Search (⌘K)"
          aria-label="Open command palette"
          className="flex h-[var(--control-md)] w-full items-center gap-2 border border-border-strong bg-surface px-2 text-[13px] text-muted transition-colors duration-[120ms] ease-standard hover:border-muted hover:text-foreground"
        >
          <SearchIcon size={16} className="shrink-0" />
          <span className="truncate">Search</span>
          <kbd className="ml-auto border border-border px-1 font-mono text-[11px] text-muted">⌘K</kbd>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        <p className="px-3 pb-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Ledger
        </p>
        {NAV_LINKS.map((link) => (
          <SidebarLink key={link.href} {...link} onClick={onNavigate} />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-3">
        <MoreMenu onNavigate={onNavigate} />
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-[var(--control-md)] w-full items-center gap-3 px-3 text-[13px] font-medium text-foreground-secondary transition-colors duration-[120ms] ease-standard hover:bg-fill-hover hover:text-foreground"
          >
            <LogOutIcon size={16} className="shrink-0 text-muted" />
            <span>Log out</span>
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-6 py-3 text-xs text-muted">
        <CovenantMark size={16} />
        <span>A Covenant Works app</span>
      </div>
    </>
  );
}

export function BrandHeader() {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <LedgerMark size={24} className="shrink-0" />
      <p className="text-xl font-semibold tracking-[-0.015em]">Ledger</p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[var(--sidebar-w)] shrink-0 flex-col border-r border-border bg-surface min-[1000px]:sticky min-[1000px]:top-0 min-[1000px]:flex min-[1000px]:h-dvh">
      <div className="flex shrink-0 items-center border-b border-border px-6 py-5">
        <BrandHeader />
      </div>
      <NavColumn />
    </aside>
  );
}

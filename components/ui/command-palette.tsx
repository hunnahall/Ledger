"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { DialogShell } from "@/components/ui/dialog-shell";
import { setTheme } from "@/components/ui/theme-toggle";
import { NAV_LINKS } from "@/components/ui/nav-links";
import {
  BudgetsIcon,
  SearchIcon,
  SettingsIcon,
  SourcesIcon,
  TransactionsIcon,
} from "@/components/ui/icons";
import type { PaletteTargets } from "@/lib/queries/palette";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

type Action = {
  id: string;
  group: string;
  label: string;
  icon: IconComponent;
  run: () => void;
};

/** True while focus is in something that takes typed text. */
function inTextField() {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

/** Dispatched by the sidebar's ⌘K chip — the palette is mounted in the (app)
 * layout, so an event is how anything else asks it to open. */
export const PALETTE_OPEN_EVENT = "ledger-palette-open";

export function CommandPalette({ targets }: { targets: PaletteTargets }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "k" && event.key !== "K") return;
      // Cmd+K is unclaimed on macOS and opens the palette from anywhere.
      // Ctrl+K is the Cocoa "delete to end of line" binding, so inside a text
      // field it stays the user's — the palette only takes it elsewhere.
      const claimed = event.metaKey || (event.ctrlKey && !inTextField());
      if (!claimed) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    }
    function handleOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(PALETTE_OPEN_EVENT, handleOpenRequest);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(PALETTE_OPEN_EVENT, handleOpenRequest);
    };
  }, []);

  const actions = useMemo<Action[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      ...NAV_LINKS.map((link) => ({
        id: `nav:${link.href}`,
        group: "Go to",
        label: link.label,
        icon: link.icon as IconComponent,
        run: go(link.href),
      })),
      {
        id: "new-transaction",
        group: "Actions",
        label: "New transaction",
        icon: TransactionsIcon,
        run: go("/transactions"),
      },
      ...(["system", "light", "dark"] as const).map((theme) => ({
        id: `theme:${theme}`,
        group: "Actions",
        label: `Theme: ${theme}`,
        icon: SettingsIcon,
        run: () => setTheme(theme),
      })),
      // Both jump into /transactions pre-filtered — the same params the
      // column filters set (see components/transactions/column-filter.tsx).
      ...targets.categories.map((category) => ({
        id: `category:${category.id}`,
        group: "Categories",
        label: category.name,
        icon: BudgetsIcon as IconComponent,
        run: go(`/transactions?category_id=${encodeURIComponent(category.id)}`),
      })),
      ...targets.sources.map((source) => ({
        id: `source:${source.id}`,
        group: "Sources",
        label: source.name,
        icon: SourcesIcon as IconComponent,
        run: go(`/transactions?source_id=${encodeURIComponent(source.id)}`),
      })),
    ];
  }, [router, targets]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) =>
      `${action.group} ${action.label}`.toLowerCase().includes(needle),
    );
  }, [actions, query]);

  // A filtered-away highlight would otherwise leave Enter pointing at nothing.
  const active = Math.min(highlighted, Math.max(matches.length - 1, 0));

  function close() {
    setOpen(false);
    setQuery("");
    setHighlighted(0);
  }

  function runAction(action: Action | undefined) {
    if (!action) return;
    close();
    action.run();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted(Math.min(active + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(Math.max(active - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runAction(matches[active]);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, matches.length]);

  if (!open) return null;

  let lastGroup: string | null = null;

  return createPortal(
    <DialogShell
      role="dialog"
      // mb-auto beats the shell's items-center, seating the palette near the
      // top of the viewport the way every other one does.
      panelClassName="mb-auto mt-[12vh] w-full max-w-lg overflow-hidden p-0"
      onDismiss={close}
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <SearchIcon size={16} className="shrink-0 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, categories, sources…"
          aria-label="Command palette"
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-paper-7"
        />
      </div>

      <ul ref={listRef} role="listbox" className="max-h-80 overflow-y-auto py-1">
        {matches.map((action, index) => {
          const Icon = action.icon;
          const startsGroup = action.group !== lastGroup;
          lastGroup = action.group;
          return (
            <li key={action.id}>
              {startsGroup && (
                <p className="px-3 pt-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
                  {action.group}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                data-active={index === active}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => runAction(action)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                  index === active ? "bg-paper-a2 text-foreground" : "text-foreground-secondary",
                )}
              >
                <Icon size={16} className="shrink-0 text-muted" />
                <span className="truncate">{action.label}</span>
              </button>
            </li>
          );
        })}
        {matches.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">No matches.</li>
        )}
      </ul>
    </DialogShell>,
    document.body,
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NAV_LINKS } from "./nav-links";

// Shared with the mobile dropdown (see NavLink) so "you are here" reads the
// same in both navs: a subtle pill, plus a gold bar pinned to the container's
// left edge — the one place the brand colour shows while you use the app.
export const NAV_ITEM_BASE =
  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[120ms] ease-standard";
export const NAV_ITEM_ACTIVE =
  "bg-surface-subtle text-foreground before:absolute before:-left-2 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-mark";
export const NAV_ITEM_IDLE = "text-muted hover:bg-paper-a2 hover:text-foreground";

export function SidebarLink({
  href,
  label,
  icon: Icon,
  collapsed,
}: (typeof NAV_LINKS)[number] & { collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? label : undefined}
      // mx-3 + the px-3 in NAV_ITEM_BASE puts the icon 24px in from the
      // sidebar edge — matches the logo's own left inset (see Sidebar) so the
      // two line up. The active bar's -left-2 reaches back into that margin,
      // leaving a 4px gutter against the sidebar edge.
      className={cn(
        "mx-3",
        NAV_ITEM_BASE,
        collapsed && "justify-center px-0",
        isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

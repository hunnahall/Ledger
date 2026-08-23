"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NAV_LINKS } from "./nav-links";

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
      // mx-3 + the px-3 below puts the icon 24px in from the sidebar edge —
      // matches the logo's own left inset (see Sidebar) so the two line up.
      className={`mx-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        collapsed ? "justify-center px-0" : ""
      } ${
        isActive
          ? "bg-surface-subtle text-foreground"
          : "text-muted hover:bg-surface-subtle hover:text-foreground"
      }`}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

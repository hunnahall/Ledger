"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEM_BASE, NAV_ITEM_ACTIVE, NAV_ITEM_IDLE } from "./sidebar-link";
import type { NAV_LINKS } from "./nav-links";

export function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: (typeof NAV_LINKS)[number] & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      // ml-3 mirrors the sidebar's inset so the active bar has the same 12px
      // of room to sit in.
      className={cn(
        "ml-3",
        NAV_ITEM_BASE,
        isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
      )}
    >
      <Icon size={18} className="shrink-0" />
      {label}
    </Link>
  );
}

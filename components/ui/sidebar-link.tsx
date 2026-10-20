"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavLinkItem } from "./nav-links";

// 30px row, 16px line icon in --fg-3, 13px label. The current item gets the
// active fill, a 2px signature marker on the left edge and a signature icon.
const ITEM_BASE =
  "relative flex h-[var(--control-md)] items-center gap-3 px-3 text-[13px] font-medium transition-colors duration-[120ms] ease-standard";
const ITEM_ACTIVE =
  "bg-fill-active text-foreground before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent";
const ITEM_IDLE = "text-foreground-secondary hover:bg-fill-hover hover:text-foreground";

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarLink({
  href,
  label,
  icon: Icon,
  onClick,
}: NavLinkItem & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_IDLE)}
    >
      <Icon size={16} className={cn("shrink-0", isActive ? "text-accent" : "text-muted")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

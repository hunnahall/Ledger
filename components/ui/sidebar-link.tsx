"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavLinkItem } from "./nav-links";
import { useReviewCount } from "./review-count";
import { NO_SOURCE_FILTER_VALUE } from "@/lib/transactions/filters";

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

export function SidebarLink(props: NavLinkItem & { onClick?: () => void }) {
  const { href, label, icon: Icon, onClick } = props;
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);
  const reviewCount = useReviewCount();
  const count = "badge" in props && props.badge === "review" ? reviewCount : 0;

  return (
    <div className="relative">
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_IDLE, count > 0 && "pr-14")}
      >
        <Icon size={16} className={cn("shrink-0", isActive ? "text-accent" : "text-muted")} />
        <span className="truncate">{label}</span>
      </Link>
      {count > 0 && (
        // Its own link: straight to the transactions that need a Source.
        <Link
          href={`/transactions?source_id=${NO_SOURCE_FILTER_VALUE}`}
          onClick={onClick}
          aria-label={`${count} transaction${count === 1 ? "" : "s"} without a Source`}
          title={`${count} without a Source`}
          className="absolute right-2 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center border border-border-strong bg-surface px-1.5 font-mono text-[11px] tabular-nums text-foreground-secondary transition-colors duration-[120ms] ease-standard hover:border-muted hover:text-foreground"
        >
          {count > 999 ? "999+" : count}
        </Link>
      )}
    </div>
  );
}

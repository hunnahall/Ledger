"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NAV_LINKS } from "./nav-links";

export function NavLink({
  href,
  label,
  onClick,
}: (typeof NAV_LINKS)[number] & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        isActive
          ? "bg-foreground text-surface"
          : "text-foreground hover:bg-border/60"
      }`}
    >
      {label}
    </Link>
  );
}

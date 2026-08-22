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
      className={`px-3 py-2 text-sm font-medium text-foreground underline decoration-2 underline-offset-4 transition-colors duration-150 ${
        isActive ? "decoration-mark" : "decoration-transparent hover:decoration-mark"
      }`}
    >
      {label}
    </Link>
  );
}

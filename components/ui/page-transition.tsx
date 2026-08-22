"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition key={pathname} name="page-content" share="auto" enter="auto" default="none">
      {children}
    </ViewTransition>
  );
}

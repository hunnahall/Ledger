"use client";

import { formatRelative } from "@/lib/format";

// Renders a timestamptz in the visitor's own timezone. This has to be a
// Client Component because Server Components have no access to the
// visitor's timezone — they'd otherwise render in UTC (or whatever
// timezone the server happens to run in), same problem either way.
// The server-rendered pass (UTC) and the client-hydrated pass (local)
// necessarily disagree, hence suppressHydrationWarning: the local value
// is the one we want to keep, so the mismatch is expected, not a bug.
//
// `relative` shows the short "2h" / "Yesterday" / "Oct 12" form, with the
// full timestamp kept as the hover title.
export function LocalTimestamp({ iso, relative = false }: { iso: string; relative?: boolean }) {
  const full = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (relative) {
    return (
      <time dateTime={iso} title={full} suppressHydrationWarning>
        {formatRelative(iso)}
      </time>
    );
  }
  return <span suppressHydrationWarning>{full}</span>;
}

import Link from "next/link";
import { getActivityLog } from "@/lib/queries/log";
import { Card } from "@/components/ui/card";
import { LocalTimestamp } from "@/components/ui/local-timestamp";
import { cn } from "@/lib/cn";

// Same look as a small secondary Button — these navigate, so they're links.
const PAGE_LINK =
  "rounded-md border border-border bg-surface px-3 py-1.5 text-sm shadow-xs hover:border-border-strong hover:bg-paper-a1";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const requested = Math.max(1, Math.floor(Number(rawPage)) || 1);
  let { entries, totalPages } = await getActivityLog(requested);
  // A stale or hand-typed ?page= past the end (e.g. after the 60-day purge
  // shrank the log) lands on the last real page instead of an empty one.
  let page = requested;
  if (page > totalPages) {
    page = totalPages;
    ({ entries, totalPages } = await getActivityLog(page));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log</h1>
      </div>

      {entries.length === 0 ? (
        <Card className="text-center text-sm text-muted">Nothing logged yet.</Card>
      ) : (
        // Same responsive-row approach as Transactions/Accounts: stacked
        // below md, reflows into one line at md+ via `contents` so it's a
        // single row layout rather than two copies to keep in sync.
        <div className="rounded-lg border border-border text-sm">
          <div className="hidden items-center gap-3 border-b border-border bg-surface-subtle px-4 py-2 text-left text-xs text-muted md:flex">
            <span className="w-40 shrink-0 font-medium">Timestamp</span>
            <span className="w-24 shrink-0 font-medium">Page</span>
            <span className="flex-1 font-medium">Variable</span>
            <span className="w-32 shrink-0 font-medium">Old value</span>
            <span className="w-32 shrink-0 font-medium">New value</span>
          </div>
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex flex-col gap-1 p-4 md:flex-row md:items-center md:gap-3 md:px-4 md:py-2 ${
                index === entries.length - 1 ? "" : "border-b border-border"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted md:contents">
                <span className="md:w-40 md:shrink-0">
                  <LocalTimestamp iso={entry.created_at} />
                </span>
                <span className="md:w-24 md:shrink-0">{entry.page}</span>
              </div>
              <div className="min-w-0 font-medium md:flex-1">{entry.variable}</div>
              <div className="flex items-center gap-2 text-xs md:contents">
                <span className="min-w-0 truncate text-muted md:w-32 md:shrink-0">
                  {entry.old_value ?? "—"}
                </span>
                <span className="min-w-0 truncate md:w-32 md:shrink-0">
                  {entry.new_value ?? "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Log pages" className="flex items-center justify-center gap-3">
          <PageLink page={page - 1} disabled={page <= 1}>
            Previous
          </PageLink>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages}>
            Next
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(PAGE_LINK, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={page === 1 ? "/log" : `/log?page=${page}`} className={PAGE_LINK}>
      {children}
    </Link>
  );
}

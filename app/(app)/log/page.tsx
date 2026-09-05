import { getActivityLog } from "@/lib/queries/log";
import { Card } from "@/components/ui/card";
import { LocalTimestamp } from "@/components/ui/local-timestamp";

export default async function LogPage() {
  const entries = await getActivityLog();

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
    </div>
  );
}

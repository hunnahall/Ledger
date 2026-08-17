"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <p className="font-medium text-negative">Something went wrong</p>
      <p className="text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
      >
        Try again
      </button>
    </div>
  );
}

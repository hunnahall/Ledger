export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
        <p className="mb-6 text-lg font-semibold tracking-tight">Ledger</p>
        {children}
      </div>
    </div>
  );
}

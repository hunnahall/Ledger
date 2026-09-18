import { LedgerMark } from "@/components/ui/mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-card-border bg-surface p-8 shadow-elevated">
        <div className="mb-6 flex items-center gap-2 text-foreground">
          <LedgerMark size={20} />
          <p className="text-lg font-semibold tracking-tight">Ledger</p>
        </div>
        {children}
      </div>
    </div>
  );
}

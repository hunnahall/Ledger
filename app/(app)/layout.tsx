import { AppNav } from "@/components/ui/app-nav";
import { LedgerMark } from "@/components/ui/mark";
import { signOut } from "@/lib/actions/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="relative z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-foreground">
            <LedgerMark size={20} />
            <p className="text-lg font-semibold tracking-tight">Ledger</p>
          </div>
          <AppNav>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:bg-border/60 md:ml-2"
              >
                Log out
              </button>
            </form>
          </AppNav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-8 pb-20">
        {children}
      </main>
    </div>
  );
}

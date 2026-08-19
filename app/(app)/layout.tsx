import { NavLink } from "@/components/ui/nav-link";
import { NAV_LINKS } from "@/components/ui/nav-links";
import { signOut } from "@/lib/actions/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">Ledger</p>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
            <form action={signOut}>
              <button
                type="submit"
                className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-border/60"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}

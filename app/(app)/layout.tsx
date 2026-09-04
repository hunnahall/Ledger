import { AppNav } from "@/components/ui/app-nav";
import { Sidebar } from "@/components/ui/sidebar";
import { signOut } from "@/lib/actions/auth";
import { getSettings } from "@/lib/queries/settings";
import { TimezoneSync } from "@/components/settings/timezone-sync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <TimezoneSync storedTimezone={settings.timezone} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* md+ uses the Sidebar for branding/nav/logout instead. */}
        <header className="relative z-10 border-b border-border bg-surface md:hidden">
          <div className="flex items-center px-6 py-5">
            <AppNav>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted underline decoration-2 decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-foreground hover:decoration-mark md:ml-2"
                >
                  Log out
                </button>
              </form>
            </AppNav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-8 pb-20">{children}</main>
      </div>
    </div>
  );
}

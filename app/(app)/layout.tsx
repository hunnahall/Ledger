import { Suspense } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Sidebar } from "@/components/ui/sidebar";
import { signOut } from "@/lib/actions/auth";
import { getSettings } from "@/lib/queries/settings";
import { TimezoneSync } from "@/components/settings/timezone-sync";
import { CommandPalette } from "@/components/ui/command-palette";
import { getPaletteTargets } from "@/lib/queries/palette";

// Neither of these renders anything on first paint — TimezoneSync returns
// null (it's an effect that offers the browser's zone once), and the palette
// only portals a dialog in once ⌘K opens it. Awaiting their data in the
// layout body still held up the whole shell: uncached reads in a layout
// aren't covered by a loading.tsx below it, so on any render of this layout
// (a direct visit, a refresh, a revalidation) nothing painted — not the
// sidebar, not the page's own loading skeleton — until both queries
// returned. Behind a Suspense boundary the shell paints immediately and this
// invisible chrome streams in after. Client-side navigation between (app)
// routes reuses the already-rendered layout either way.
async function AppChrome() {
  const [settings, paletteTargets] = await Promise.all([getSettings(), getPaletteTargets()]);

  return (
    <>
      <TimezoneSync storedTimezone={settings.timezone} />
      <CommandPalette targets={paletteTargets} />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Suspense fallback={null}>
        <AppChrome />
      </Suspense>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* md+ uses the Sidebar for branding/nav/logout instead. */}
        <header className="relative z-10 border-b border-border bg-surface md:hidden">
          <div className="flex items-center px-6 py-5">
            <AppNav>
              <form action={signOut}>
                <button
                  type="submit"
                  className="ml-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors duration-[120ms] ease-standard hover:bg-paper-a2 hover:text-foreground"
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

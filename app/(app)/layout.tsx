import { Suspense } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Sidebar } from "@/components/ui/sidebar";
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
    <div className="flex min-h-dvh flex-col min-[1000px]:flex-row">
      <Suspense fallback={null}>
        <AppChrome />
      </Suspense>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppNav />
        <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 pt-6 pb-20 min-[640px]:px-6 min-[1000px]:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";

/**
 * Names and ids the command palette can jump to. Deliberately two lean
 * selects rather than a reuse of getFilterOptions (lib/queries/transactions),
 * which also pulls accounts and orders sources around the Budget source —
 * work the palette has no use for, on every page rather than just
 * /transactions.
 */
export async function getPaletteTargets() {
  const supabase = await createClient();
  const [{ data: categories, error: categoriesError }, { data: sources, error: sourcesError }] =
    await Promise.all([
      supabase.from("categories").select("id, name").is("archived_at", null).order("name"),
      supabase.from("sources").select("id, name").is("archived_at", null).order("name"),
    ]);
  for (const error of [categoriesError, sourcesError]) {
    if (error) throw new Error(error.message);
  }
  return { categories: categories ?? [], sources: sources ?? [] };
}

export type PaletteTargets = Awaited<ReturnType<typeof getPaletteTargets>>;

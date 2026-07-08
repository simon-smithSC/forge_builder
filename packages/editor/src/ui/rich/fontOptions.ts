// Typeface options for the selection toolbar's font menu, derived from the
// player's courseFontCatalog (the single font authority per POLISH-PLAN V4)
// so the toolbar offers exactly the faces the player can resolve - and the
// embedded ones ship as WOFF2 in published packages.
import { courseFontCatalog, fontStackOf } from "@forge/player";

export const FONT_OPTIONS: readonly string[] = courseFontCatalog.map(
  (face) => face.name,
);

/**
 * Full curated stack for a typeface, quote-free. Applying the FULL stack
 * (not the bare name) means published output renders identically with zero
 * player-side mapping. Catalog stacks are quote-free by contract; quotes are
 * still stripped defensively because the browser's CSSOM re-serializes quoted
 * names with double quotes and getHTML escapes those to &quot; - a sequence
 * the sanitizer's font-family charset rejects.
 */
export function toolbarFontStack(name: string): string {
  return fontStackOf(name).replace(/['"]/g, "");
}

/** Display name for a committed font-family value, or null when unknown. */
export function fontNameOfStack(stack: string | null | undefined): string | null {
  if (typeof stack !== "string" || stack === "") return null;
  const normalized = stack.replace(/['"]/g, "").trim();
  for (const name of FONT_OPTIONS) {
    if (toolbarFontStack(name) === normalized) return name;
  }
  return null;
}

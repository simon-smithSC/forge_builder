// Typeface options for the selection toolbar's font menu. The names mirror
// the curated FONT_STACKS table in packages/player/src/fonts.ts (only
// fontStackOf is exported, not the table itself) so the toolbar offers
// exactly the faces the player can resolve. V4's font catalog will replace
// this mirror with the real catalog module.
import { fontStackOf } from "@forge/player";

export const FONT_OPTIONS: readonly string[] = [
  "Inter",
  "Lato",
  "Roboto",
  "Open Sans",
  "Source Sans Pro",
  "Montserrat",
  "Nunito",
  "Merriweather",
  "Playfair Display",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Helvetica",
  "Courier New",
];

/**
 * Full curated stack for a typeface, quote-free. Applying the FULL stack
 * (not the bare name) means published output renders identically with zero
 * player-side mapping. Quotes are stripped because the browser's CSSOM
 * re-serializes quoted names with double quotes and getHTML escapes those to
 * &quot; - a sequence the sanitizer's font-family charset rejects. Every
 * curated name is a plain letter sequence, valid as an unquoted CSS ident.
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

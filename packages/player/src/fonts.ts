// Course typeface authority (POLISH-PLAN V4, absorbing U6): the curated font
// catalog, fallback stacks, and the pure helpers that turn a theme into a
// WOFF2 file list + @font-face CSS. Consumed by the player chrome, the editor
// canvas / ThemeEditor / selection toolbar (via @forge/player), the publish
// pipeline, and scripts/fetch-course-fonts.mjs.
//
// Stacks are deliberately QUOTE-FREE: the V2 toolbar discovered that quoted
// family names round-trip through the CSSOM as &quot; inside style attributes
// and fail the sanitizer. Every curated name is a valid sequence of unquoted
// CSS idents. Idents cannot start with a digit, so faces whose marketing name
// ends in a number (Source Serif 4) register under a digit-free css family
// name - the FIRST entry of the stack is always the css family name that the
// generated @font-face rules declare.

export interface CourseFontFace {
  /** Display name; also the value stored in theme typeface fields. */
  name: string;
  category: "serif" | "sans" | "system";
  /** Fontsource package id. Absent = system face, never embedded. */
  fontsourceId?: string;
  /** Static weights fetched/embedded for this face. */
  weights: readonly number[];
  /** Quote-free fallback stack; first entry is the css family name. */
  stack: string;
}

const EMBEDDED = [400, 700] as const;
const NONE: readonly number[] = [];

export const courseFontCatalog: readonly CourseFontFace[] = [
  // ---- Sans (embedded via Fontsource) ----
  { name: "Inter", category: "sans", fontsourceId: "inter", weights: EMBEDDED, stack: "Inter, Helvetica Neue, Arial, sans-serif" },
  { name: "Lato", category: "sans", fontsourceId: "lato", weights: EMBEDDED, stack: "Lato, Helvetica Neue, Arial, sans-serif" },
  { name: "Roboto", category: "sans", fontsourceId: "roboto", weights: EMBEDDED, stack: "Roboto, Segoe UI, Arial, sans-serif" },
  { name: "Open Sans", category: "sans", fontsourceId: "open-sans", weights: EMBEDDED, stack: "Open Sans, Segoe UI, Arial, sans-serif" },
  // Fontsource publishes Source Sans Pro as source-sans-3 (Adobe's rename).
  { name: "Source Sans Pro", category: "sans", fontsourceId: "source-sans-3", weights: EMBEDDED, stack: "Source Sans Pro, Segoe UI, Arial, sans-serif" },
  { name: "Montserrat", category: "sans", fontsourceId: "montserrat", weights: EMBEDDED, stack: "Montserrat, Helvetica Neue, Arial, sans-serif" },
  { name: "Nunito", category: "sans", fontsourceId: "nunito", weights: EMBEDDED, stack: "Nunito, Segoe UI, Arial, sans-serif" },
  { name: "Nunito Sans", category: "sans", fontsourceId: "nunito-sans", weights: EMBEDDED, stack: "Nunito Sans, Segoe UI, Arial, sans-serif" },
  { name: "Work Sans", category: "sans", fontsourceId: "work-sans", weights: EMBEDDED, stack: "Work Sans, Helvetica Neue, Arial, sans-serif" },
  { name: "IBM Plex Sans", category: "sans", fontsourceId: "ibm-plex-sans", weights: EMBEDDED, stack: "IBM Plex Sans, Segoe UI, Arial, sans-serif" },
  { name: "Karla", category: "sans", fontsourceId: "karla", weights: EMBEDDED, stack: "Karla, Helvetica Neue, Arial, sans-serif" },
  { name: "Manrope", category: "sans", fontsourceId: "manrope", weights: EMBEDDED, stack: "Manrope, Helvetica Neue, Arial, sans-serif" },
  // ---- Serif (embedded via Fontsource) ----
  { name: "Merriweather", category: "serif", fontsourceId: "merriweather", weights: EMBEDDED, stack: "Merriweather, Georgia, Times New Roman, serif" },
  { name: "Playfair Display", category: "serif", fontsourceId: "playfair-display", weights: EMBEDDED, stack: "Playfair Display, Georgia, serif" },
  { name: "Lora", category: "serif", fontsourceId: "lora", weights: EMBEDDED, stack: "Lora, Georgia, Times New Roman, serif" },
  // "4" is not a valid css ident, so the face registers as Source Serif.
  { name: "Source Serif 4", category: "serif", fontsourceId: "source-serif-4", weights: EMBEDDED, stack: "Source Serif, Georgia, Times New Roman, serif" },
  { name: "Libre Baskerville", category: "serif", fontsourceId: "libre-baskerville", weights: EMBEDDED, stack: "Libre Baskerville, Georgia, Times New Roman, serif" },
  { name: "Spectral", category: "serif", fontsourceId: "spectral", weights: EMBEDDED, stack: "Spectral, Georgia, Times New Roman, serif" },
  // ---- System faces (never embedded) ----
  { name: "Georgia", category: "system", weights: NONE, stack: "Georgia, Times New Roman, Times, serif" },
  { name: "Times New Roman", category: "system", weights: NONE, stack: "Times New Roman, Times, serif" },
  { name: "Arial", category: "system", weights: NONE, stack: "Arial, Helvetica, sans-serif" },
  { name: "Helvetica", category: "system", weights: NONE, stack: "Helvetica, Helvetica Neue, Arial, sans-serif" },
  { name: "Helvetica Neue", category: "system", weights: NONE, stack: "Helvetica Neue, Helvetica, Arial, sans-serif" },
  { name: "Courier New", category: "system", weights: NONE, stack: "Courier New, Courier, monospace" },
  { name: "system-ui", category: "system", weights: NONE, stack: "system-ui, -apple-system, Segoe UI, sans-serif" },
];

// Lowercased-name lookup (theme typefaces are stored as bare display names).
const catalogByName: ReadonlyMap<string, CourseFontFace> = new Map(
  courseFontCatalog.map((face) => [face.name.toLowerCase(), face]),
);

/** css family name a face's @font-face rules register (first stack entry). */
function cssFamilyOf(face: CourseFontFace): string {
  return face.stack.split(",")[0]!.trim();
}

/**
 * Full CSS font-family stack for a theme typeface name. Known names get a
 * curated stack; unknown names are quoted (when needed) and fall back to
 * system-ui so a typo in the theme never breaks rendering.
 */
export function fontStackOf(typeface: string): string {
  const name = typeface.trim();
  if (name === "") return "system-ui, sans-serif";
  const known = catalogByName.get(name.toLowerCase());
  if (known !== undefined) return known.stack;
  const quoted = /[^a-zA-Z0-9-]/.test(name) ? `"${name}"` : name;
  return `${quoted}, system-ui, sans-serif`;
}

/** One embeddable WOFF2 file: <fontsourceId>-<weight>.woff2. */
export interface FontFileRef {
  /** css family name the @font-face rule registers. */
  family: string;
  fontsourceId: string;
  weight: number;
  file: string;
}

function compareFiles(a: FontFileRef, b: FontFileRef): number {
  if (a.fontsourceId !== b.fontsourceId) {
    return a.fontsourceId < b.fontsourceId ? -1 : 1;
  }
  return a.weight - b.weight;
}

function filesOf(faces: readonly CourseFontFace[]): FontFileRef[] {
  const files = faces.flatMap((face) => {
    const id = face.fontsourceId;
    if (id === undefined) return [];
    return face.weights.map((weight) => ({
      family: cssFamilyOf(face),
      fontsourceId: id,
      weight,
      file: `${id}-${weight}.woff2`,
    }));
  });
  files.sort(compareFiles);
  return files;
}

/**
 * The deduped, sorted WOFF2 files a theme needs (heading/body/ui typefaces
 * resolved through the catalog; system and unknown faces contribute nothing).
 */
export function fontFilesFor(theme: {
  headingTypeface: string;
  bodyTypeface: string;
  uiTypeface: string;
}): FontFileRef[] {
  const faces = new Map<string, CourseFontFace>();
  for (const typeface of [
    theme.headingTypeface,
    theme.bodyTypeface,
    theme.uiTypeface,
  ]) {
    const face = catalogByName.get(typeface.trim().toLowerCase());
    if (face?.fontsourceId !== undefined) faces.set(face.fontsourceId, face);
  }
  return filesOf([...faces.values()]);
}

/** Every embeddable file in the catalog (editor canvas css, fetch script). */
export function allCourseFontFiles(): FontFileRef[] {
  return filesOf(courseFontCatalog);
}

/**
 * Deterministic @font-face rules for the given files (deduped and sorted by
 * fontsourceId then weight). The default prefix suits the published package:
 * fonts.css is normalized to lib/fonts.css, so url("fonts/<file>") resolves
 * to lib/fonts/<file> where the publish pipeline places the binaries.
 */
export function buildFontFaceCss(
  files: readonly FontFileRef[],
  urlPrefix = "fonts/",
): string {
  const unique = [...new Map(files.map((file) => [file.file, file])).values()];
  unique.sort(compareFiles);
  const rules = unique.map((entry) =>
    [
      "@font-face {",
      `  font-family: ${entry.family};`,
      "  font-style: normal;",
      `  font-weight: ${entry.weight};`,
      "  font-display: swap;",
      `  src: url("${urlPrefix}${entry.file}") format("woff2");`,
      "}",
    ].join("\n"),
  );
  return rules.length > 0 ? `${rules.join("\n\n")}\n` : "";
}

/**
 * Foreground color that stays readable on the given hex surface (theme
 * primary/accent are free-form hex): WCAG relative luminance against the
 * 0.179 midpoint. Unparseable input gets white (safe on saturated brands).
 */
export function readableTextOn(color: string): string {
  const hex = color.trim().replace(/^#/, "");
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return "#ffffff";
  const channel = (offset: number): number => {
    const value = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.179 ? "#1f2328" : "#ffffff";
}

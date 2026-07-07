// Curated typeface -> CSS font stack mapping (docs/PLAYER-UX-PLAN.md U3).
// Theme typefaces are stored as bare names ("Merriweather"); the player maps
// known names to full stacks so every platform gets a coherent fallback.
// Shipping the actual WOFF2 files with @font-face is U6 (exporter, R-next).

const FONT_STACKS: Readonly<Record<string, string>> = {
  inter: 'Inter, "Helvetica Neue", Arial, sans-serif',
  lato: 'Lato, "Helvetica Neue", Arial, sans-serif',
  merriweather: 'Merriweather, Georgia, "Times New Roman", serif',
  georgia: 'Georgia, "Times New Roman", Times, serif',
  roboto: 'Roboto, "Segoe UI", Arial, sans-serif',
  "open sans": '"Open Sans", "Segoe UI", Arial, sans-serif',
  "source sans pro": '"Source Sans Pro", "Segoe UI", Arial, sans-serif',
  montserrat: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
  nunito: 'Nunito, "Segoe UI", Arial, sans-serif',
  "playfair display": '"Playfair Display", Georgia, serif',
  "times new roman": '"Times New Roman", Times, serif',
  arial: "Arial, Helvetica, sans-serif",
  helvetica: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
  "helvetica neue": '"Helvetica Neue", Helvetica, Arial, sans-serif',
  "courier new": '"Courier New", Courier, monospace',
  "system-ui": 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

/**
 * Full CSS font-family stack for a theme typeface name. Known names get a
 * curated stack; unknown names are quoted (when needed) and fall back to
 * system-ui so a typo in the theme never breaks rendering.
 */
export function fontStackOf(typeface: string): string {
  const name = typeface.trim();
  if (name === "") return "system-ui, sans-serif";
  const known = FONT_STACKS[name.toLowerCase()];
  if (known !== undefined) return known;
  const quoted = /[^a-zA-Z0-9-]/.test(name) ? `"${name}"` : name;
  return `${quoted}, system-ui, sans-serif`;
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

// Anvil token build. Reads the DTCG source (anvil.tokens.json) and emits:
//   src/anvil.css   custom properties under the .anvil scope class: primitives,
//                   light semantics, [data-theme="dark"] semantic remap,
//                   [data-density="compact"] remap, reduced-motion collapse.
//   src/tokens.ts   typed constants mirroring both tiers (committed, compiled
//                   on the next tsc run; build script order is tsc then this).
// Both generated files are committed; anvil.css is also copied into dist so a
// built package is self-sufficient. No dependencies beyond node builtins.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface ShadowPart {
  color: string;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
}
type TokenValue = string | number | string[] | number[] | ShadowPart[];
interface TokenGroup {
  [key: string]: TokenGroup | TokenValue | string | undefined;
}

const here = dirname(fileURLToPath(import.meta.url)); // <pkg>/dist/tokens at runtime
const pkgRoot = join(here, "..", "..");
const srcDir = join(pkgRoot, "src");
const source = JSON.parse(
  readFileSync(join(srcDir, "tokens", "anvil.tokens.json"), "utf8"),
) as TokenGroup;

// ---- flatten primitives ----------------------------------------------------

function isToken(node: TokenGroup): boolean {
  return Object.prototype.hasOwnProperty.call(node, "$value");
}

function formatValue(value: TokenValue, type: string): string {
  if (type === "fontFamily" && Array.isArray(value)) {
    return (value as string[])
      .map((f) => (/[ ]/.test(f) ? `"${f}"` : f))
      .join(", ");
  }
  if (type === "cubicBezier" && Array.isArray(value)) {
    return `cubic-bezier(${(value as number[]).join(", ")})`;
  }
  if (type === "shadow" && Array.isArray(value)) {
    return (value as ShadowPart[])
      .map((p) => `${p.offsetX} ${p.offsetY} ${p.blur} ${p.spread} ${p.color}`)
      .join(", ");
  }
  return String(value);
}

/** path ("color.cobalt.500") -> resolved CSS value */
const flat = new Map<string, string>();

function walk(node: TokenGroup, path: string[], inheritedType: string): void {
  const type = typeof node.$type === "string" ? node.$type : inheritedType;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") || child === undefined) continue;
    const childNode = child as TokenGroup;
    if (typeof childNode === "object" && !Array.isArray(childNode) && isToken(childNode)) {
      const value = (childNode as { $value: TokenValue }).$value;
      const childType =
        typeof childNode.$type === "string" ? (childNode.$type as string) : type;
      flat.set([...path, key].join("."), formatValue(value, childType));
    } else if (typeof childNode === "object" && !Array.isArray(childNode)) {
      walk(childNode, [...path, key], type);
    }
  }
}
walk(source, [], "");

function cssVarName(path: string): string {
  return `--an-${path.replaceAll(".", "-")}`;
}

// ---- semantic tier ----------------------------------------------------------
// Values are either primitive token paths (emitted as var() refs in CSS and
// resolved literals in TS) or literal CSS strings.

const isPath = (v: string): boolean => flat.has(v);
const css = (v: string): string => (isPath(v) ? `var(${cssVarName(v)})` : v);
const resolved = (v: string): string => flat.get(v) ?? v;

const semanticLight: Record<string, string> = {
  "surface-sunken": "color.neutral.100",
  "surface-base": "color.neutral.50",
  "surface-raised": "color.neutral.0",
  "surface-overlay": "color.neutral.0",
  "text-primary": "color.neutral.900",
  "text-secondary": "color.neutral.600",
  "text-muted": "color.neutral.500",
  "text-inverse": "color.neutral.0",
  "interactive-idle": "color.cobalt.600",
  "interactive-hover": "color.cobalt.700",
  "interactive-active": "color.cobalt.800",
  "interactive-selected": "color.cobalt.50",
  "accent": "color.ember.500",
  "accent-strong": "color.ember.600",
  "accent-soft": "color.ember.100",
  "border-subtle": "color.neutral.200",
  "border-strong": "color.neutral.300",
  "focus-ring-color": "color.cobalt.500",
  "focus-ring":
    "0 0 0 2px var(--an-surface-base), 0 0 0 4px var(--an-focus-ring-color)",
  "backdrop": "rgba(11, 12, 15, 0.4)",
  "status-success-fg": "color.success.600",
  "status-success-bg": "color.success.50",
  "status-success-border": "color.success.200",
  "status-success-solid": "color.success.500",
  "status-warn-fg": "color.warn.700",
  "status-warn-bg": "color.warn.50",
  "status-warn-border": "color.warn.200",
  "status-warn-solid": "color.warn.500",
  "status-danger-fg": "color.danger.600",
  "status-danger-bg": "color.danger.50",
  "status-danger-border": "color.danger.200",
  "status-danger-solid": "color.danger.500",
  "status-info-fg": "color.info.600",
  "status-info-bg": "color.info.50",
  "status-info-border": "color.info.200",
  "status-info-solid": "color.info.500",
  // density-aware sizing (remapped under [data-density="compact"])
  "control-sm": "1.75rem",
  "control-md": "2.125rem",
  "control-lg": "2.5rem",
  "inset-sm": "space.8",
  "inset-md": "space.12",
  "inset-lg": "space.16",
  "gap-sm": "space.6",
  "gap-md": "space.8",
  "gap-lg": "space.12",
};

const semanticDark: Record<string, string> = {
  "surface-sunken": "color.neutral.1000",
  "surface-base": "color.neutral.950",
  "surface-raised": "color.neutral.900",
  "surface-overlay": "color.neutral.800",
  "text-primary": "color.neutral.100",
  "text-secondary": "color.neutral.400",
  "text-muted": "color.neutral.500",
  "text-inverse": "color.neutral.950",
  "interactive-idle": "color.cobalt.400",
  "interactive-hover": "color.cobalt.300",
  "interactive-active": "color.cobalt.200",
  "interactive-selected": "color.cobalt.900",
  "accent": "color.ember.400",
  "accent-strong": "color.ember.300",
  "accent-soft": "color.ember.950",
  "border-subtle": "color.neutral.800",
  "border-strong": "color.neutral.700",
  "focus-ring-color": "color.cobalt.400",
  "backdrop": "rgba(11, 12, 15, 0.6)",
  "status-success-fg": "color.success.400",
  "status-success-bg": "color.success.950",
  "status-success-border": "color.success.800",
  "status-warn-fg": "color.warn.400",
  "status-warn-bg": "color.warn.950",
  "status-warn-border": "color.warn.800",
  "status-danger-fg": "color.danger.400",
  "status-danger-bg": "color.danger.950",
  "status-danger-border": "color.danger.800",
  "status-info-fg": "color.info.400",
  "status-info-bg": "color.info.950",
  "status-info-border": "color.info.800",
};

const semanticCompact: Record<string, string> = {
  "control-sm": "1.5rem",
  "control-md": "1.75rem",
  "control-lg": "2.125rem",
  "inset-sm": "space.6",
  "inset-md": "space.8",
  "inset-lg": "space.12",
  "gap-sm": "space.4",
  "gap-md": "space.6",
  "gap-lg": "space.8",
};

// Tier 3: component knobs themes may override. Deliberately small.
const componentTokens: Record<string, string> = {
  "dialog-width-sm": "26rem",
  "dialog-width-md": "36rem",
  "dialog-width-lg": "48rem",
  "drawer-width": "20rem",
};

// ---- emit CSS ----------------------------------------------------------------

const lines: string[] = [];
lines.push("/* GENERATED by src/tokens/build.ts from anvil.tokens.json. Do not edit. */");
lines.push("/* Anvil design tokens (--an-*). Scope class: .anvil (per-app adoption). */");
lines.push("");
lines.push(".anvil {");
lines.push("  /* tier 1: primitives */");
let lastGroup = "";
for (const [path, value] of flat.entries()) {
  const group = path.split(".")[0] ?? "";
  if (group !== lastGroup) {
    if (lastGroup !== "") lines.push("");
    lastGroup = group;
  }
  lines.push(`  ${cssVarName(path)}: ${value};`);
}
lines.push("");
lines.push("  /* tier 2: semantics (light) */");
for (const [name, value] of Object.entries(semanticLight)) {
  lines.push(`  --an-${name}: ${css(value)};`);
}
lines.push("");
lines.push("  /* tier 3: component knobs */");
for (const [name, value] of Object.entries(componentTokens)) {
  lines.push(`  --an-${name}: ${value};`);
}
lines.push("}");
lines.push("");
lines.push("/* Base chrome text setting. Anvil owns app chrome only; never wrap");
lines.push("   learner course content (--forge-*/--fb-* stay author-themed). */");
lines.push(".anvil {");
lines.push("  font-family: var(--an-font-family-sans);");
lines.push("  font-size: var(--an-font-size-14);");
lines.push("  line-height: var(--an-font-line-14);");
lines.push("  font-weight: var(--an-font-weight-regular);");
lines.push("  color: var(--an-text-primary);");
lines.push("  background: var(--an-surface-base);");
lines.push("  -webkit-font-smoothing: antialiased;");
lines.push("}");
lines.push("");
lines.push('/* Dark mode: semantic remap only; primitives stay constant. Tool chrome');
lines.push("   only; a dark editor around a light course is correct and expected. */");
lines.push('.anvil[data-theme="dark"] {');
for (const [name, value] of Object.entries(semanticDark)) {
  lines.push(`  --an-${name}: ${css(value)};`);
}
lines.push("}");
lines.push("");
lines.push("/* Density: compact remaps control heights and spacing semantics. */");
lines.push('.anvil[data-density="compact"] {');
for (const [name, value] of Object.entries(semanticCompact)) {
  lines.push(`  --an-${name}: ${css(value)};`);
}
lines.push("}");
lines.push("");
lines.push("@media (prefers-reduced-motion: reduce) {");
lines.push("  .anvil {");
for (const path of flat.keys()) {
  if (path.startsWith("duration.")) lines.push(`    ${cssVarName(path)}: 0ms;`);
}
lines.push("  }");
lines.push("}");
lines.push("");

const cssOut = lines.join("\n");
writeFileSync(join(srcDir, "anvil.css"), cssOut);
copyFileSync(join(srcDir, "anvil.css"), join(pkgRoot, "dist", "anvil.css"));
copyFileSync(join(srcDir, "components.css"), join(pkgRoot, "dist", "components.css"));

// ---- emit TS ------------------------------------------------------------------

function nest(): Record<string, unknown> {
  const rootObj: Record<string, unknown> = {};
  for (const [path, value] of flat.entries()) {
    const parts = path.split(".");
    let cursor = rootObj;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i] as string;
      if (typeof cursor[part] !== "object" || cursor[part] === null) cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1] as string] = value;
  }
  return rootObj;
}

const tsTokens = {
  ...nest(),
  semantic: {
    light: Object.fromEntries(
      Object.entries(semanticLight).map(([k, v]) => [k, resolved(v)]),
    ),
    dark: Object.fromEntries(
      Object.entries(semanticDark).map(([k, v]) => [k, resolved(v)]),
    ),
    compact: Object.fromEntries(
      Object.entries(semanticCompact).map(([k, v]) => [k, resolved(v)]),
    ),
  },
  component: componentTokens,
};

const ts = [
  "// GENERATED by src/tokens/build.ts from anvil.tokens.json. Do not edit.",
  "// Resolved token values for programmatic use (canvas, email, native).",
  "// CSS consumers should use the --an-* custom properties from anvil.css.",
  `export const anvilTokens = ${JSON.stringify(tsTokens, null, 2)} as const;`,
  "",
  "export type AnvilTokens = typeof anvilTokens;",
  "",
  "/** CSS custom property name for a primitive token path, e.g. cssVar(\"color.cobalt.500\") -> \"--an-color-cobalt-500\". */",
  "export function cssVar(path: string): string {",
  '  return `--an-${path.replaceAll(".", "-")}`;',
  "}",
  "",
].join("\n");
writeFileSync(join(srcDir, "tokens.ts"), ts);

const primitiveCount = flat.size;
const semanticCount = Object.keys(semanticLight).length;
console.log(
  `anvil tokens built: ${primitiveCount} primitives, ${semanticCount} semantics (light), ` +
    `${Object.keys(semanticDark).length} dark remaps, ${Object.keys(semanticCompact).length} compact remaps, ` +
    `${Object.keys(componentTokens).length} component knobs -> src/anvil.css, src/tokens.ts`,
);

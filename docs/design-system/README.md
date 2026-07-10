# Anvil

Anvil is the T&S design system, shipped as `@forge/ui` (workspace name; the
system is Anvil and the tokens are `--an-*`). It is the surface Forge tools are
shaped on: industrial precision without noise. See
`docs/DESIGN-SYSTEM-PLAN.md` for the full program plan and roadmap.

## Identity

- **Type**: Geist Sans for UI (OFL, fetched from Fontsource as static
  400/500/600/700 weights; tracking tightened at display/heading sizes via
  the role tokens), JetBrains Mono for IDs, code, and xAPI/publish detail.
  Twelve Base-style roles (`--an-type-*`:
  display/heading/label/paragraph/mono) with hard floors: 16px default
  reading, 14px UI paragraph/label, 13px small label, 12px absolute.
  Webfont binaries are not committed; fetch once with
  `node packages/ui/scripts/fetch-fonts.mjs`. Metric-adjusted `local()` fallback
  faces were removed after the Chrome/Times incident; Anvil now falls back to
  plain system sans/mono stacks.
- **Icons**: 104 stroke icons on the 24px Lucide grid, vendored as data
  (`<Icon name size={16|20|24} />`, ISC attribution); sizes 16 inline, 20
  controls, 24 emphasis, stroke width 2.
- **Color**: deep cobalt primary ramp (interactive voice), cool steel neutrals,
  and a restrained ember amber accent used sparingly (progress, warm emphasis).
- **Depth**: a 5-level elevation scale of layered shadows (border-tint + key +
  ambient, neutral-tinted) coupled with surface tint steps
  (sunken / base / raised / overlay) so hierarchy survives dark mode.
- **Motion**: decisive, 80-280ms, exits faster than enters, everything
  collapses under `prefers-reduced-motion`.

## Principles

1. **Tokens before pixels.** Components consume the semantic tier
   (`--an-surface-*`, `--an-text-*`, `--an-interactive-*`, `--an-status-*`,
   `--an-border-*`, `--an-focus-ring`) plus non-color primitives (space,
   radius, type, elevation, motion, z). Color primitives are never referenced
   by component or app CSS directly.
2. **Semantic remap, constant primitives.** Dark mode
   (`data-theme="dark"`) and density (`data-density="compact"`) remap only the
   semantic tier on the `.anvil` scope. Primitives never change at runtime.
3. **Anvil owns app chrome only.** Learner course content is skinned by the
   author-controlled course theme (`--forge-*` / `--fb-*`), which Anvil never
   overrides. Player chrome takes structure/elevation/motion/focus from Anvil
   and brand accents from the course theme.
4. **Data-attribute styling.** One class per component (`.an-btn`), variants
   and states as data attributes (`data-variant="primary"`, `data-size="sm"`).
   No utility-class framework.
5. **Extraction-ready.** `@forge/ui` imports nothing from other `@forge`
   packages, permanently. Anything needing `CourseDoc`, blocks, or xAPI stays
   out.

## How an app consumes Anvil

```tsx
import "@forge/ui/fonts.css";        // Geist Sans + JetBrains Mono @font-face
import "@forge/ui/anvil.css";        // tokens (scope class .anvil)
import "@forge/ui/components.css";   // component styles
import { Button, Dialog, Icon, ToastHost, toast } from "@forge/ui";

export function App() {
  return (
    <div className="anvil">          {/* add data-theme="dark" / data-density="compact" */}
      <Button variant="primary">Publish</Button>
      <ToastHost />
    </div>
  );
}
```

- Depend on `@forge/ui` via `workspace:*` (later: internal registry under a
  Forge-free name).
- Set `data-theme` / `data-density` on the same element carrying the `anvil`
  class; persist the choice per app.
- App CSS may consume `--an-*` tokens but may never define or override them.

## Files

- `packages/ui/src/tokens/anvil.tokens.json`: DTCG source of truth.
- `packages/ui/src/tokens/build.ts`: emits `src/anvil.css` + `src/tokens.ts`
  (both generated and committed; `pnpm build` = tsc, then token build).
- `packages/ui/src/components.css`: hand-written component styles.
- `packages/ui/src/fonts.css` + `packages/ui/scripts/fetch-fonts.mjs`:
  webfont faces and the one-time binary fetch (network required).
- `packages/ui/scripts/generate-icons.mjs`: regenerates `src/icons/icons.ts`
  from the workspace lucide-react (edit NAMES, rerun, rebuild).
- `scripts/make-styleguide.mjs`: builds `anvil-styleguide.html`, the living
  styleguide and review artifact (run after building `packages/ui`).
- `docs/design-system/tokens.md`: token reference. `decisions.md`: decision log.

## Drift checks

- Theme Editor and runtime contrast surfaces use luminance-derived contrast
  for primary/accent fills where those paths are wired.
- Future font or theme changes must keep these docs aligned with rules B7 and
  E2: no risky CSS-comment terminator prose, no `inherit` in font-family
  lists, no metric-override `local()` fallback faces, and quote-free font
  stacks where course content is sanitized.

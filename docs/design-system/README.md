# Anvil

Anvil is the T&S design system, shipped as `@forge/ui` (workspace name; the
system is Anvil and the tokens are `--an-*`). It is the surface Forge tools are
shaped on: industrial precision without noise. See
`docs/DESIGN-SYSTEM-PLAN.md` for the full program plan and roadmap.

## Identity

- **Type**: Inter for UI (letter-spacing tightened at 12-13px via
  `--an-font-tracking-tight`), JetBrains Mono for IDs, code, and xAPI/publish
  detail.
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
import "@forge/ui/anvil.css";        // tokens (scope class .anvil)
import "@forge/ui/components.css";   // component styles
import { Button, Dialog, ToastHost, toast } from "@forge/ui";

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
- `scripts/make-styleguide.mjs`: builds `anvil-styleguide.html`, the living
  styleguide and review artifact (run after building `packages/ui`).
- `docs/design-system/tokens.md`: token reference. `decisions.md`: decision log.

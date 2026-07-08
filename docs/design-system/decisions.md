# Anvil decision log

Small, dated decisions for the design system. System-level architecture calls
graduate to ADRs in `docs/adr/`; API changes follow semver in
`packages/ui/CHANGELOG.md`.

## 2026-07-08: D1 tokens

- **Identity: Anvil** (per plan candidate A). Inter + JetBrains Mono, deep
  cobalt primary, ember amber accent, cool steel neutrals.
- **DTCG JSON as source of truth** (`anvil.tokens.json`, 2025.10 stable
  format), transformed by a zero-dependency node script (`build.ts`) into
  `anvil.css` and `tokens.ts`. Both generated files are committed; the build
  script runs after tsc (`build`: tsc, then `node dist/tokens/build.js`), so a
  token JSON edit needs one build to refresh `tokens.ts` and a second tsc pass
  to refresh its compiled mirror in dist.
- **Scope class `.anvil` instead of `:root`** so Anvil can coexist with the
  legacy `--fe-*` chrome during D3 migration and be adopted per-app; dark mode
  is `.anvil[data-theme="dark"]`, density is `.anvil[data-density="compact"]`,
  both semantic-tier remaps only.
- **Elevation is 5 levels (0-4)**, not the plan's sketched 0-5: level 4
  (dialogs/drawer) also serves toasts. Each level is border-tint + key +
  ambient, tinted with neutral-950, alpha falling as blur grows.
- **Semantic mappings live in `build.ts`**, not the JSON: the DTCG file stays
  a pure primitive palette; the light/dark/compact maps are code, next to the
  emitter that orders them.
- **Density tokens are semantic sizes** (`--an-control-*`, `--an-inset-*`,
  `--an-gap-*`) rather than remapped space primitives, so layout spacing stays
  stable while control chrome tightens.
- Prompted deviations from the plan recorded: radius scale is
  2/4/6/10/16/999 and durations are 80/120/160/200/280 (the plan sketched
  2/4/6/8/12/16/full and 80-360).

## 2026-07-08: D2 primitives

- **24 components shipped** (Button, IconButton, Input, Textarea, Select,
  Checkbox, Radio, Switch, Badge, Chip, Card, Dialog, Popover, Menu, Tabs,
  Tooltip, ProgressBar, ProgressRing, SegmentedControl, Toolbar, Drawer,
  EmptyState, Skeleton, Toast). React 19 function components, refs as props
  (`ComponentPropsWithRef`), zero dependencies beyond react.
- **Dialog ports the editor's focus-trap bones**
  (`packages/editor/src/ui/dialogs/Dialog.tsx`): same trap/restore/Escape
  semantics, re-skinned on tokens, plus `width` and `footer` props. No portal:
  fixed-position backdrop keeps react-dom out of the dependency tree.
- **Styling contract**: one hand-written `components.css` consuming only
  `--an-*` tokens (semantic colors; primitive space/radius/type/motion/
  elevation/z), data-attribute driven. No hex/rgba/px-radius/shadow/duration
  literals (grep-enforceable for D3's lint rule).
- **A11y patterns per APG**: Menu and Toolbar use roving focus, Tabs use
  automatic activation, SegmentedControl is a radiogroup, Switch is
  role=switch, Toast host is a polite live region. Tooltip uses a wrapper-span
  anchor (documented limitation: describedby sits on the wrapper).
- **Drawer is non-modal** (settings rail); width animates with
  enter-200ms/exit-160ms asymmetry and the closed panel is `inert`.
- **Styleguide is compiled TSX** (`src/styleguide/`, excluded from the public
  API) bundled by `scripts/make-styleguide.mjs` with the same data-URL
  import-map technique as `make-standalone.mjs`; react comes from esm.sh at
  view time.

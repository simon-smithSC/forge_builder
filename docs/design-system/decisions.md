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

## 2026-07-08: D4 player chrome adoption (value copy, not import)

- **The player copies Anvil's structural VALUES; it never imports @forge/ui.**
  The player ships self-contained inside published zips (make-standalone,
  exporter), where no `@forge/ui` package, `.anvil` scope class, or `--an-*`
  variable exists at runtime. Importing the DS would either bloat every
  published course with unused editor chrome or break standalone rendering.
  Instead `packages/player/src/styles.css` opens with a token block scoped
  under `.fp-player` defining `--fp-space-*`, `--fp-radius-*`,
  `--fp-elevation-1..4` (Anvil's layered shadow stacks verbatim),
  `--fp-duration-*` and `--fp-ease-*`, and `--fp-type-*-size/line` pairs,
  each annotated with its Anvil source token name (e.g. `an-radius-md`) so
  drift is grep-auditable against `packages/ui/src/anvil.css`.
- **The three-layer boundary holds** (plan section 2.3): structure, spacing,
  elevation, motion, and focus geometry are Anvil values; color accents,
  backgrounds, and typefaces stay course-themed (`--forge-*` from
  `chrome.tsx`, `readableTextOn`, `fontStackOf`). Anvil's cobalt and ember
  appear nowhere in the player. Chrome values were snapped to the nearest
  Anvil step (e.g. quiz card radius 12px to 10px, prompt 1.35rem to 1.375rem).
- **Elevation replaces hairline borders for chrome depth**: topbar
  elevation-2 (sticky-bar tier), desktop sidebar and quiz card elevation-1
  (card tier), mobile overlay drawer elevation-4 (dialog tier), matching the
  editor's depth language. The `.fp-nav-current` inset accent bar stays
  course-primary.
- **Focus rings adopt Anvil's two-layer pattern recolored from the theme**:
  `--fp-focus-ring` is a 2px `--forge-bg` gap plus a 2px `--forge-primary`
  ring drawn as box-shadow (replacing the old 3px outline), applied to
  buttons, nav rows, search, quiz pills/inputs, and the choice glyph.
- **Quiz correctness colors adopt Anvil status values** (`--fp-chrome-*`
  copied from an-color-success-500/600 and an-color-danger-500/600),
  replacing the previous arbitrary GitHub-palette greens and reds. They are
  pedagogical status, not brand, so they are fixed rather than course-themed.
- **Locked out of scope**: Rise-measured entrance timings (1s / 0.12s /
  0.15s, `entrance.ts`) and the lesson content column (header band, footer
  measure, `.fp-main` padding) keep their measured values; chrome motion
  tokens collapse to 0ms under `prefers-reduced-motion` like Anvil's.

## 2026-07-08: D1.5 typography, icons, system depth

- **Geist Sans replaces Inter as the UI face.** Owner feedback called the type
  lousy and small. Geist (Vercel, OFL 1.1) has a taller x-height and wider
  apertures than Inter at 13-16px, reads crisper on low-DPI, ships as a single
  variable woff2, and its license permits vendoring. Runner-up was staying on
  Inter with `ss01`; rejected because the complaint was legibility, not
  styling. JetBrains Mono stays for code/IDs. Binaries are NOT committed:
  `node packages/ui/scripts/fetch-fonts.mjs` downloads them from the
  Fontsource mirrors of the official releases; until then `fonts.css` serves a
  metric-adjusted (size-adjust) local fallback so layout never reflows.
- **Type roles over raw sizes** (Base-style, cf. base.uber.com typography:
  display/heading/label/paragraph categories, each an explicit
  size + line-height + weight + tracking setting). Twelve roles
  (displayLarge 40/48/700 down to labelSmall 13/18/500 and mono 13/20) live in
  the DTCG source as `typography` composites and emit `--an-type-*` vars plus
  `.an-type-*` classes; `Heading`/`Text`/`Label` are the React mapping.
  Floors are policy: 16px default reading, 14px UI paragraph and label,
  13px small label, 12px absolute (`--an-font-size-11` deleted so violations
  fail the build). Control heights standardized at 28/36/44px.
- **Icons are vendored data, not a dependency.** `scripts/generate-icons.mjs`
  extracts a curated 104-icon set (editor chrome usage + system basics) from
  the workspace's lucide-react into `src/icons/icons.ts` (ISC attribution in
  the generated header); `<Icon name size={16|20|24} strokeWidth={2}>` renders
  it. Keeps @forge/ui at zero runtime deps beyond react, pins geometry against
  upstream renames, and gives the styleguide a searchable gallery. lucide-react
  stays installed in the editor for deep, not-yet-migrated usages.
- **FormField wires accessibility structurally**: it generates the control id,
  points `aria-describedby` at the hint or the error (error wins and is
  `role=alert`), and paints the invalid border from the wrapper
  (`.an-field[data-invalid]`), so any control composes without new props.

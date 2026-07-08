# @forge/ui changelog

Semver from D1 onward. Breaking token renames or semantic remaps require a
major bump plus a codemod note (see docs/design-system/decisions.md).

## 0.2.0 (2026-07-08)

- D1.5 typography: Geist Sans replaces Inter as the Anvil UI face (variable
  woff2, OFL; JetBrains Mono unchanged). New `./fonts.css` export with
  `font-display: swap` and metric-adjusted local fallbacks; binaries fetched
  once via `node packages/ui/scripts/fetch-fonts.mjs` (not committed).
- Type roles: twelve Base-style roles (displayLarge..paragraphSmall, mono) in
  the DTCG source, emitted as `--an-type-*` composite custom properties and
  `.an-type-*` utility classes. New `Heading` / `Text` / `Label` components.
- Size-up: chrome floors are 14px UI paragraph/label, 13px small label, 12px
  absolute; `--an-font-size-11` removed, sizes 20/24/32/40 added; every
  component moved up one type step (buttons/inputs/menu items 14px at md).
  Control heights now sm 28 / md 36 / lg 44px.
- Icon system: `Icon` component + `src/icons/icons.ts` with 104 icons vendored
  from lucide-react via `scripts/generate-icons.mjs` (ISC attribution; still
  zero runtime deps beyond react). Sizing tokens 16/20/24, stroke 2.
- System depth: `Stack` / `Inline` / `Divider` layout primitives and
  `FormField` (label + hint + error slot, aria-describedby/aria-invalid wired,
  invalid border painted from the field wrapper).
- State completeness: focus ring extended to interactive cards; do/dont,
  anatomy notes, and focus/disabled/invalid state rows added per component in
  the styleguide, restructured as Foundations / Components / Patterns /
  Principles with a searchable icon gallery and live type specimens.

## 0.1.0 (2026-07-08)

- D1: Anvil token system. DTCG source (`src/tokens/anvil.tokens.json`),
  generated `anvil.css` (141 primitives, 45 semantics, dark + compact remaps,
  reduced-motion collapse, `.anvil` scope class) and typed `tokens.ts`.
  Exports: `.` (components + tokens), `./anvil.css`, `./components.css`.
- D2: 24 primitives (Button, IconButton, Input, Textarea, Select, Checkbox,
  Radio, Switch, Badge, Chip, Card, Dialog, Popover, Menu, Tabs, Tooltip,
  ProgressBar, ProgressRing, SegmentedControl, Toolbar, Drawer, EmptyState,
  Skeleton, Toast) plus `components.css`. Living styleguide via
  `scripts/make-styleguide.mjs` -> `anvil-styleguide.html`.

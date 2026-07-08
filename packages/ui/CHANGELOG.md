# @forge/ui changelog

Semver from D1 onward. Breaking token renames or semantic remaps require a
major bump plus a codemod note (see docs/design-system/decisions.md).

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

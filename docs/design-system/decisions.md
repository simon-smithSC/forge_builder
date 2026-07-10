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

## 2026-07-08: V5A beautification quick wins

- **Brand gradients + Wordmark.** Two semantic tokens,
  `--an-brand-gradient` (cobalt 500 to 700, 135deg) and
  `--an-accent-gradient` (ember 400 to 600), live as literal entries in the
  build.ts semantic maps (same mechanism as `--an-focus-ring`); the DTCG JSON
  stays a pure primitive palette. They are the ONLY sanctioned gradients in
  Anvil chrome, and their only surfaces are the new `Wordmark` component (24px
  rounded-square anvil glyph + ember spark facet, optional "Forge" text in the
  heading-small role) and the course-card cover strip. Adopted in the editor
  topbar, overview header, and course list; the ember ramp finally has a brand
  job beyond the progressbar.
- **Bevel tokens for solid-fill controls.** `ShadowPart` in build.ts gains an
  `inset?: boolean` (DTCG shadow inset extension); new primitive shadow group
  `bevel` emits `--an-bevel-highlight` (inset 0 1px, white 14%) and
  `--an-bevel-edge` (inset 0 -1px, neutral-950 18%). Primary and danger
  buttons compose `bevel-highlight, bevel-edge, elevation-N` at rest, hover,
  and active. Full gradient button fills were REJECTED (banding; Base/Linear
  ship near-flat fills plus machined bevels).
- **Input focus glow.** Semantic `--an-focus-glow` (3px halo,
  `color-mix` of the focus-ring color at 18% light / 28% dark) plus
  `--an-focus-glow-danger` (danger solid, same mixes) applied to
  Input/Textarea/Select `:focus-visible` alongside the border shift; invalid
  fields (`data-invalid`, `aria-invalid`, or an invalid FormField wrapper) get
  the danger glow. The two-layer keyboard `--an-focus-ring` on buttons is an
  a11y contract and is untouched. Editor raw-input rules mirror the glow.
- **Empty-state halo.** `.an-empty-icon` becomes a 64px disc: radial
  `--an-interactive-selected` tint (circle at 50% 35%), one faint concentric
  ring (8px `color-mix` spread), icon in `--an-interactive-idle`. Bespoke
  illustrations were REJECTED (asset weight, style drift risk) - the halo
  gives empty states a face using only existing tokens. Component API
  unchanged. On the author-themed canvas the editor scopes the empty state
  onto its own Anvil surface so dark-chrome text never lands on light paper.
- **Feedback components activated.** Toast and Skeleton, shipped in D2 and
  consumed by nothing, are now live: `ToastHost` mounts at the editor App
  root; publish success, course create/open failures, and conflict-recovery
  outcomes route through `toast()`. Persistent states (conflict banner,
  journal restore banner) STAY banners; form-level validation stays inline
  `role="alert"`. The course-list loading text is replaced by a Skeleton card
  grid matching the real card geometry.

## 2026-07-08: V5B depth system and rhythm

- **Elevation is theme-mapped.** `--an-elevation-0..4` moved from tier-1
  primitives into the light/dark semantic maps in build.ts. The DTCG source
  keeps the shadow stacks as primitives (`elevation.0-4` plus a parallel
  `elevation.dark.0-4` group); build.ts hides the group from tier-1 emission
  and resolves the literals into both maps, so light values are byte-identical
  and the public names never changed. Dark variants keep each level's
  geometry but swap the border-tint ring for a light inner keyline
  (`#ffffff12`, i.e. white at 7% - dark surfaces cannot cast a darker ring)
  and deepen key/ambient alphas ~1.5x. Every `--an-elevation-N` consumer
  inherited dark-mode depth with zero call-site changes (completes V1.4's
  "usable but flat" dark mode).
- **Border/elevation rule: a raised surface gets elevation, and its ring IS
  the border; hairline borders only divide regions WITHIN a surface.** Fixed
  offenders: `.fe-lib-card` and `.fe-lib-strip` dropped their 1px borders,
  `.fe-lib-panel` its border-right, `.fq-add-menu` its border, and the
  editor topbar its always-on elevation (below). Settings-tray sections now
  separate by spacing + their small-caps headers instead of striping the
  tray with hairlines (the panel header keeps its hairline). Anvil
  secondary Button/IconButton keep border + elevation deliberately: control
  edges are an affordance (border-color shifts on hover), not surface
  chrome. `.an-drawer`'s side hairline also stays: closed it has no
  elevation, so the hairline is its only edge.
- **New semantic tokens: `--an-border-faint` and `--an-backdrop-blur`.**
  border-faint is `color-mix(in srgb, var(--an-border-subtle) 60%,
  transparent)` in both maps - the within-surface divider for elevated
  panels (Anvil dialog header/footer, `.fe-dlg-footer`), one step quieter
  than border-subtle so it never doubles the elevation ring. backdrop-blur
  (4px, both maps) drives `backdrop-filter: blur() saturate(1.1)` on the
  dialog backdrop and library scrim, `@supports`-guarded so engines without
  backdrop-filter keep the plain tint. Popovers now spring from their
  anchor: transform-origin follows data-placement and the entrance runs
  `--an-ease-spring` at `--an-duration-160`.
- **Scroll-aware topbar.** `.fe-topbar` idles FLAT (hairline only; constant
  elevation over nothing was a double edge) and gains elevation-2 while its
  scroll container is off the top. Mechanism: `ui/useScrolled.ts` (callback
  ref + rAF-throttled scrollTop check) feeds a `data-scrolled` attribute;
  EditorScreen watches `.fe-canvas`, CourseOverview watches `.fe-ov-main`.
- **Token rhythm sweep + --fe- bridge retired.** overview.css, publish.css,
  library.css, dialogs.css, and inline.css lost their off-scale raw values
  (10/11/14/15/18/22px paddings, 15px/0.85rem type, `100ms ease`) for the
  nearest `--an-space-*` / `--an-font-size-*` / motion tokens. Deliberate
  literals stay: 46rem measure, 96px scroll headroom, hairlines, fixed
  thumb/swatch geometry, dialog min/max widths. inline.css was the last
  `--fe-*` consumer; it now reads `--an-*` directly and the D3 bridge block
  in ui/styles.css is DELETED - the editor greps clean of `--fe-`.
- **Library personality.** Card thumbs carry `data-cat` from a per-category
  `tint` field in libraryData.ts, painting family pairs from existing
  primitives: text-ish (text/statement/quote/list/callout) cobalt-50/600,
  media (image/gallery/multimedia/chart/code/table/audio) info-50/600,
  interactive (interactive/scenario/checklist/divider) ember-50/600,
  knowledge check success-50/600. Dark mode mixes the 500 step to 18% over
  transparent with a 300-step icon so the 50-tints never glare. Thumb icons
  scale 1.08 on card hover (`--an-ease-spring`, `--an-duration-160`), and
  the category rail's active item gains a 2px left indicator in
  `--an-interactive-idle` on top of the existing tint (the tint alone was a
  weak position signal). Duotone icon re-vendor stays REJECTED (104-asset
  cost, marginal gain).

## 2026-07-08: V5C signature moves

- **Accent story codified: cobalt is interactive, ember is brand energy and
  progress.** Cobalt (`--an-interactive-*`) marks anything you can act on:
  buttons, links, selection, focus. Ember appears only where the product
  celebrates momentum: the Wordmark spark facet, `--an-accent-gradient`, and
  progress affordances via `[data-accent]` on ProgressBar/ProgressRing. Ember
  must never mark an interactive control (it would read as a second primary)
  and cobalt must never fill a progress track (it would read as a button).
  Adoption: the publish dialog's ProgressBar flips to the ember accent -
  publishing is the editor's one brand-energy moment. It is the editor's only
  progressbar today (the overview outline shows no course-progress meter), so
  no other adoption exists; nothing was invented to wear the accent.
- **Save badge tone crossfade.** `.an-badge` gains a background-color/color/
  border-color transition on `--an-duration-160`, so the topbar save-status
  badge (saved/saving/offline/conflict) crossfades between tones instead of
  snapping. Applies to all badges; tone changes are state changes and deserve
  the same 160ms tier as other state transitions.
- **Player chrome flair, value-copied (D4 discipline).** All three moves land
  as `--fp-` values with an- provenance comments; `packages/player/src` still
  contains zero `--an-` references or @forge/ui imports. (1) New
  `--fp-bevel-highlight`/`--fp-bevel-edge` (an-bevel-highlight/an-bevel-edge
  verbatim) compose onto the solid fills - `.fp-button-primary` (incl. cover
  start) and `.fp-quiz-pill` - with a focus-visible rule that layers the ring
  over the bevel instead of replacing it. (2) The player topbar adopts the
  editor's 5B.2 scroll-aware rule: flat + course-tinted hairline at rest,
  elevation-2 fading in on `[data-scrolled="true"]`, driven by a local
  rAF-throttled `useScrolledFlag` hook in chrome.tsx watching `.fp-main`
  (mechanism mirrored from ui/useScrolled.ts, never imported). (3) Sidebar
  active item: the plan's "bar + pill fill" already shipped in D4
  (`.fp-nav-current` = inset 3px bar + 14% primary tint); the planned 8% fill
  was NOT applied because 8% is the hover tint - active stays one step
  stronger. No change made.
- **Micro-interaction pass.** Overview row actions fade AND settle in
  (rest: opacity 0 + translateX(2px); hover/focus-within: 1 + 0, both on
  duration-120). `.an-menu-item` hover wash transitions on duration-80 (menus
  are scanned fast; 120 lags). `.an-iconbtn:active` dips to scale(0.96) with
  a duration-80 transform transition. `.fe-outline-item` already had its
  duration-120 background transition (D3); its hover controls keep the
  `display` toggle rather than an opacity fade - making them opacity-0 would
  permanently reserve ~56px of the 260px rail and squeeze long lesson titles.
  Entrance timings in the player (1s / 0.12s / 0.15s) remain LOCKED and
  untouched. All new motion is token-driven, so prefers-reduced-motion
  collapses it wholesale.
- **Styleguide**: TokensSection gains a "Depth and focus finishes" specimen
  (bevelled primary, focus-glow input, the two sanctioned gradients) so 5A/5C
  finishes are visible in review; Wordmark specimen landed with V5A.

## 2026-07-09: B5 course accent Tier 1 (blocks)

- **Course color roles codified.** Course PRIMARY owns actions and reading
  affordances: buttons (continue/start/submit), links, tabs, selected and
  hover states, impact bands/borders, knowledge-check chrome. Course ACCENT
  owns non-interactive structure/energy markers: numbered-list circles and
  bulleted dots, the divider numbered circle, process counter count / step
  circle / active dot, timeline spine / node border and fill / eyebrow
  label, and labeled-graphic markers + pulse. The checklist "Required" pill
  (previously the accent's only block surface) is now consistent instead of
  orphaned.
- **Correct/incorrect stay semantic** green/red (quiz, knowledge check,
  sorting results); callout icons keep their semantic palette. Neither role
  ever colors correctness.
- **Anvil's ember accent stays chrome-only** (Wordmark spark, gradients,
  progress affordances per V5C); the course accent and Anvil accent remain
  separate systems and never cross the blocks/chrome boundary.
- **Contrast**: accent-filled circles use `--fb-accent-contrast`
  (`var(--forge-accent-contrast, #ffffff)`), luminance-derived via
  `readableTextOn(theme.accentColor)` in player chrome.tsx and now also in
  editor Canvas.tsx themeVars for canvas parity.
- **Compat consequence (accepted by Simon)**: existing courses shift these
  markers from primary blue to accent orange (defaults) on republish.
  CSS-only, trivially reversible.

## 2026-07-09: B6 theme contrast and rhythm hardening

- **Primary contrast is now a course-theme token, not an assumption.**
  Player chrome already derived `--forge-primary-contrast` from
  `readableTextOn(theme.primaryColor)`; editor canvas now mirrors that value
  and `@forge/blocks` aliases it as `--fb-primary-contrast`. Primary-filled
  block controls and bands use that foreground instead of fixed white, so an
  author choosing a pale primary color does not silently publish unreadable
  buttons. Accent-filled structure markers continue to use
  `--fb-accent-contrast`.
- **Theme Editor contrast checks match runtime behavior.** The contrast panel
  checks computed text on primary and computed text on accent markers rather
  than checking white on primary. A small live preview shows the same role
  split authors see in blocks: primary for actions, accent for structure and
  momentum, surface/background/text for reading.
- **Course `spacingScale` is rendered through a shared multiplier.** The
  schema already stored `compact | comfortable | spacious`; canvas and player
  now emit `--forge-block-spacing` (`0.875`, `1`, `1.2`) and `BlockView`
  multiplies the existing block padding scale by it. This keeps the per-block
  padding model intact while making the course-level rhythm control visible.
- **Contract coverage**: `scripts/contract-check.mjs` now fails if shared
  block CSS pairs a primary fill with hard-coded white text. This protects the
  author-theme boundary without importing Anvil into player or blocks.

## 2026-07-09: D7 product composites slice

- **Anvil now owns generic product chrome composites, not Forge domain
  objects.** `ProductShell.tsx` exports shell regions and status banners;
  `ProductPatterns.tsx` exports inspector, library, asset, dropzone, and upload
  patterns. Props are slot-based (`title`, `meta`, `actions`, `preview`,
  `selected`, `progress`) and deliberately avoid course, lesson, block, and
  media model types.
- **The components stay extraction-ready.** They add no dependencies beyond
  React, compose existing primitives where useful, and expose semantic
  `.an-*` classes styled in `components.css` with Anvil tokens. The player
  remains out of scope: no player imports, no player CSS, and no runtime
  artifacts changed.
- **The styleguide is the review surface.** `ProductPatternsSection` shows the
  shell, inspector, library, asset tile, dropzone, and upload row working
  together so future T&S apps can copy product anatomy without copying Forge
  editor internals.

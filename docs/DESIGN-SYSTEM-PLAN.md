# Forge Design System Program Plan

Status: proposed. Owner: Simon Smith (Supercell T&S). Scope: a token-first design system
housed at `packages/ui` (`@forge/ui`), consumed first by Forge (editor + player chrome),
built to be extracted for future T&S apps. This document is the plan only; nothing here
is implemented yet.

---

## 1. Why now

An audit of the current editor chrome (9 CSS files, 2,337 lines under
`packages/editor/src/ui/`: `styles.css` 962, `dialogs/dialogs.css` 274, `quiz/quiz.css` 261,
`library/library.css` 242, `overview/overview.css` 228, `publish/publish.css` 126,
`rich/rich.css` 124, `dnd.css` 60, `payload/payload.css` 60) shows the token system has
already lost to ad hoc values:

- **Color**: 22 distinct hex literals plus 20 distinct `rgba()` literals (42 hardcoded
  colors) against only 10 defined `--fe-*` tokens in `styles.css`. Five different reds
  serve as "danger" (`#c0392b`, `#d1242f`, `#b42318`, `#f5c6c0`, `#fdecea`), and grays
  come from at least three unrelated families (`#6b7280`, `#59636e`, `#d0d7de`).
- **Type**: 15 distinct font sizes, mixing units (`10px` to `30px` plus `0.8rem`,
  `0.85rem`, `0.9rem`, `1rem`). No scale, no line-height system.
- **Radii**: 13 distinct `border-radius` values. `--fe-radius` (8px) is used 9 times;
  hardcoded `6px` is used 20 times. The token lost.
- **Shadows**: 13 distinct `box-shadow` values; `--fe-shadow` is used only 5 times, and
  it is a single-layer `0 1px 3px rgba(20,23,28,0.08)`. Everything else is a one-off.
- **Spacing**: 67 distinct padding values and 16 distinct gap values, mixing px and rem.
- **Motion**: three ad hoc durations (120ms, 160ms, 200ms), no easing tokens, no
  reduced-motion handling.

**Flatness diagnosis**: the UI reads flat because depth is expressed almost entirely as
1px borders on white (`--fe-surface: #ffffff` on `--fe-bg: #f4f5f7`, hairline
`--fe-border`), with a single faint one-layer shadow token. There is no elevation scale,
no surface tint progression, and no hover-lift language. Modern depth comes from layered
shadows (2 to 3 stacked layers per level) plus surface steps, which we have zero of.

**The two-tier token reality (load-bearing, must be formalized, not collapsed)**:

- `--fe-*` (editor chrome, `packages/editor/src/ui/styles.css`): skins the authoring tool.
- `--forge-*` (player, `packages/player/src/styles.css`, 868 lines) and `--fb-*` (blocks,
  `packages/blocks/src/styles.css`, 1,445 lines): skin the learner content, and are set at
  runtime from `course.theme` in `packages/player/src/chrome.tsx` (primary, bg, surface,
  text, accent, fonts, computed contrast). These are author-controlled brand values, not
  system values. 12 more hex literals hide in player+blocks and need token backing.

`packages/ui` exists today as an empty stub (`src/index.ts` only), reserved for exactly
this system.

---

## 2. Architecture

### 2.1 Package: `@forge/ui`

A standalone tokens + components package at `packages/ui`. Working name for the system
itself: **Anvil** (see section 3). No imports from `@forge/editor`, `@forge/player`,
`@forge/blocks`, or `@forge/schema`, ever. Structure:

```
packages/ui/
  src/tokens/        primitive + semantic tokens (CSS custom properties + TS export)
  src/components/    React components (one folder per component, co-located CSS)
  src/index.ts       public API
  tokens.css         built stylesheet consumers import once
  styleguide/        living styleguide source (section 5)
```

Tokens are authored once in a TS/JSON source of truth (W3C DTCG token format, `$value` /
`$type`, stable 2025.10 spec) and emitted as both CSS custom properties and a typed TS
export, so future non-CSS consumers (native, canvas, email) can read the same file.

### 2.2 Token tiers

- **Tier 1, primitives** (`--an-*`, never referenced by components directly):
  color ramps (neutral 0..1000 with a slightly cool tint, accent ramp, and status ramps
  for danger/success/warn/info, each 10 to 12 steps), space scale (4px base:
  2/4/6/8/12/16/20/24/32/40/48/64), type scale (11/12/13/14/16/18/22/28 with paired
  line-heights and 3 weights), radius scale (2/4/6/8/12/16/full), elevation scale
  (levels 0..5, each a 2-3 layer shadow stack, see 3.2), motion (durations 80/120/160/
  240/360ms, easings: standard, enter, exit, spring), z-index bands (base/raised/
  sticky/overlay/modal/toast).
- **Tier 2, semantics** (what components use): `surface`, `surface-raised`,
  `surface-overlay`, `surface-sunken`, `text`, `text-muted`, `text-subtle`,
  `interactive`, `interactive-hover`, `interactive-active`, `interactive-selected-bg`,
  `danger`/`success`/`warn` (fg + bg + border each), `focus-ring`, `border`,
  `border-strong`. Dark mode and density swap the semantic-to-primitive mapping only.
- **Tier 3, component tokens**: only where a component needs a knob that themes must
  override (`--an-button-height`, `--an-dialog-width-md`). Kept deliberately small.

Contrast policy: WCAG 2.2 AA as the compliance floor, APCA Lc targets as the design
tool when building the ramps (Lc 75+ for 12-13px chrome text, Lc 60+ for body), because
WCAG 2 ratios mislead in dark mode.

### 2.3 The three skinning layers (the critical boundary)

1. **Design system (Anvil, `--an-*`)** skins the tool: editor chrome, dialogs, rails,
   drawer, library, quiz authoring, overview, publish. Replaces `--fe-*` entirely.
2. **Course theme (`--forge-*` / `--fb-*`)** skins the content: learner-facing blocks and
   lesson typography, driven by `course.theme` via `packages/player/src/chrome.tsx`.
   Authors own these values. The DS never overrides them; the block canvas inside the
   editor keeps rendering with course-theme tokens exactly as today.
3. **Player chrome (sidebar, nav, progress ring, continue gate)** sits in between:
   structure, spacing, elevation, motion, and focus states come from Anvil; brand
   accents (primary, accent, fonts) continue to come from the course theme. Concretely,
   player chrome components consume `--an-*` layout/elevation tokens whose accent slots
   alias to `--forge-*` values.

Dark mode: implemented as a semantic remap under `[data-theme="dark"]` on the app root,
tool chrome only. Course content stays author-themed (a dark editor around a light
course is correct and expected). Density: `[data-density="compact"]` remaps the space
scale and control heights; default is comfortable.

### 2.4 Distribution for future apps

Now: pnpm workspace package (`@forge/ui`), consumed via `workspace:*`. Later: publishable
to the internal registry under a Forge-free name (for example `@ts/anvil`). From D1
onward: semver, a `CHANGELOG.md` in `packages/ui`, and a rule that breaking token renames
require a major bump plus a codemod note. Design decisions for the system itself go in
the existing ADR log (`docs/adr/`), starting with ADR 0005: design system architecture.

---

## 3. Identity

Constraints: internal Supercell T&S tool family. Professional, fast, quietly confident.
Not game-flavored kitsch, and deliberately not a Rise clone: Rise is friendly but flat
and anonymous; we want calm surfaces with real depth and a precise, slightly technical
voice.

### Candidate A: **Anvil** (recommended)

- One line: the surface Forge tools are shaped on, industrial precision without noise.
- Type: Inter (UI, tightened letter-spacing at 12-13px) + JetBrains Mono for IDs, code,
  and xAPI/publish detail. Optional display cut for large headings later.
- Accent: deep cobalt (evolving the current `#1f6feb` toward a slightly deeper, more
  saturated cobalt ramp) with a restrained ember amber as the secondary highlight (a nod
  to the forge, used sparingly: progress, warm emphasis). Neutrals: cool steel grays.
- Depth/motion: decisive. Crisp layered shadows, short confident motion (120-200ms,
  pronounced exit-faster-than-enter asymmetry), hover states that lift.

### Candidate B: Northlight

- One line: Nordic clarity, cool light over dark water; calm, spacious, low-contrast chrome.
- Type: Inter or Geist Sans + IBM Plex Mono. Accent: aurora teal/ice blue ramp.
- Depth/motion: soft, diffuse, large-radius shadows; slower, gentler motion (200-300ms).
  Beautiful but risks reading passive for a production tool.

### Candidate C: Meridian

- One line: navigational instrument; gridded, exact, high-information-density.
- Type: Geist Sans + Geist Mono. Accent: indigo/violet with signal green for success.
- Depth/motion: minimal shadows, depth mostly via surface steps and hairlines; near-instant
  motion. Strong for dashboards, likely too austere for a content-authoring canvas.

**Recommendation: Anvil.** It names the family relationship (tools forged on Anvil),
suits T&S (sturdy, dependable, exact), and gives depth and motion a clear character.

### 3.1 What "visual depth" concretely means here

Not border boxes. An elevation system with two coupled parts:

- **Elevation scale** `--an-elevation-0..5`: each level is a stacked shadow (tight
  ambient layer + soft key layer, plus a third wide layer at 4-5), tinted with the
  neutral hue rather than pure black, opacity decreasing as blur grows. Level mapping:
  0 flat (canvas), 1 cards/rows, 2 raised controls + sticky bars, 3 popovers/menus,
  4 dialogs/drawer, 5 toasts.
- **Surface tint steps**: `surface-sunken / surface / surface-raised / surface-overlay`
  as distinct neutral steps, so hierarchy survives dark mode where shadows weaken
  (higher elevation = lighter surface in dark mode).
- Interaction depth: hover raises one elevation step with a 120ms transform+shadow
  transition; pressed compresses. Focus is a two-layer ring (`--an-focus-ring`), not
  outline defaults.

---

## 4. Component inventory (day one, from the audit)

| Anvil component | Replaces (current fe- implementation) |
| --- | --- |
| Button (primary/secondary/ghost/danger; sm/md/lg) | `.fe-btn`, `.fe-insert-btn`, `.fe-ov-edit-link`, ad hoc buttons in `publish.css`, `quiz.css` |
| IconButton | `.fe-icon-btn`, `.fe-outline-toggle`, `.fe-preview-close`, `.fe-rich-btn` |
| Input / Textarea / Select | `.fe-field`, `.fe-title-input`, `.fe-ov-title-input`, `.fe-ov-desc-input`, `.fe-ov-author-input`, `.fe-ov-create-input`, selects in `payload.css` and `quiz.css` |
| Checkbox / Radio / Switch | ad hoc inputs in `SettingsPanel`, `quiz.css`, `publish.css` |
| Dialog | `dialogs/dialogs.css` (media picker, confirms) |
| Popover | insert menu (`.fe-insert`), color pickers (`.fe-color-row`) |
| Menu | block rail context actions (`.fe-rail-chip` menus), variant pickers (`.fe-variant-option`) |
| Tabs / SegmentedControl | preview device switch (`.fe-preview-frame-desktop/tablet/phone`), settings format tabs (`.fe-settings-format`) |
| Toast | publish result banners (`.fe-publish-result`, `.fe-publish-warning-group`) |
| Tooltip | currently `title` attributes only |
| Badge / Chip | `.fe-rail-chip`, status pills in `overview.css` and `library.css` |
| Card | library cards (`library.css` `.fe-media-item`), `.fe-ov-row` course rows |
| ProgressBar / ProgressRing | publish progress (`publish.css`), player ring (adopted in D4) |
| Skeleton / EmptyState | ad hoc empty text in `library.css`, `overview.css` |
| Toolbar | `.fe-topbar`, rich text toolbar (`rich.css`) |
| Drawer | `.fe-drawer` (block settings rail) |

Forge-specific composites (BlockEditFrame, block rail, insert strip, outline tree, canvas
slots, dnd affordances in `dnd.css`) stay in `@forge/editor` but are rebuilt from Anvil
primitives and tokens.

---

## 5. Documentation plan

- **Living styleguide**: a single self-contained HTML page checked into the repo and
  built like `forge-review.html` (see `scripts/make-standalone.mjs`), output
  `anvil-styleguide.html`. Contents: every token rendered (ramps, spacing, elevation
  demo cards, motion demos honoring `prefers-reduced-motion`), every component in every
  state (hover/focus/disabled/dark/compact), and do/dont pairs per component. This is
  the review artifact for each D phase.
- **Markdown docs** at `docs/design-system/`: `principles.md` (identity, depth, motion,
  voice), `tokens.md` (generated reference from the token source), `contributing.md`
  (naming rules, how to add a token or component, review checklist), and
  `components/<name>.md` per component (anatomy, props, do/dont, accessibility notes).
- **Decision log**: system-level decisions as ADRs in `docs/adr/` (0005 architecture,
  then one per contested call, for example APCA policy, dark mode scope). Small choices
  go in `packages/ui/CHANGELOG.md`.
- No Storybook initially: the standalone styleguide page keeps zero infra cost and
  matches the repo's existing review-artifact habit. Revisit if a second app adopts Anvil.

---

## 6. Implementation roadmap

- **D1: tokens package + styleguide skeleton.** Token source (DTCG JSON/TS) emitting
  `tokens.css` + typed exports from `packages/ui`; light theme complete; styleguide page
  builds and renders all tokens. Accepts: `@forge/ui` builds in the workspace,
  editor imports `tokens.css` with zero visual change (aliases map `--fe-*` to `--an-*`
  temporarily), styleguide committed.
- **D2: core primitives.** Button, IconButton, Input/Textarea/Select, Dialog, Popover,
  Menu, plus focus-ring and elevation utilities. Accepts: keyboard and screen-reader
  a11y verified (focus trap in Dialog, roving tabindex in Menu), all states on the
  styleguide with do/dont, APCA-checked text tokens.
- **D3: editor chrome migration, file by file.** Order: `TopBar.tsx` + `styles.css`
  topbar section, block rail + insert strip, `.fe-drawer` settings rail,
  `dialogs/dialogs.css`, `library/library.css`, `overview/overview.css`,
  `publish/publish.css`, `quiz/quiz.css`, `payload/payload.css`, `rich/rich.css`.
  Accepts per file: no hex/rgba/px-radius/shadow literals remain (lint-greppable), the
  source CSS file is deleted or reduced to layout-only, screenshots reviewed against
  the styleguide. Deletions: `dialogs.css`, `payload.css` fully deleted; `library.css`,
  `overview.css`, `publish.css`, `quiz.css` shrink to layout-only; `styles.css` loses
  its `:root` block and all control styling; `dnd.css` and `rich.css` retained but
  tokenized. The `--fe-*` alias shim from D1 is deleted at the end of D3.
- **D4: player chrome adoption.** Player sidebar, nav, progress ring, continue gate take
  structure/elevation/motion/focus from Anvil while accents alias to `--forge-*`
  course-theme values; `packages/player/src/chrome.tsx` mapping documented in
  `docs/design-system/theming.md`. Accepts: a course with a garish theme still renders
  legible chrome (contrast fallbacks), 12 hex literals in player/blocks replaced by
  tokens or theme aliases, block content rendering byte-identical.
- **D5: depth + motion pass.** Apply the elevation scale and motion tokens everywhere:
  hover lifts, dialog/drawer enter-exit choreography, toast slide, dnd pickup shadow.
  Accepts: no `box-shadow` or `transition` literals outside `packages/ui`,
  `prefers-reduced-motion` collapses all motion to instant, before/after screenshots.
- **D6: dark mode.** Full semantic remap under `[data-theme="dark"]`, toggle in editor
  settings, persisted. Accepts: every styleguide section passes in dark, APCA spot
  checks on chrome text, course canvas remains author-themed.
- **D7: extraction readiness.** Density mode shipped, package boundary audit (zero
  imports from other Forge packages, verified by a lint rule in CI alongside
  `scripts/contract-check.mjs`), semver + changelog in place, a minimal "new app"
  consumption example in `packages/ui/README.md`. Accepts: `@forge/ui` builds and its
  styleguide renders from a clean checkout with no other packages built.

Each phase lands as its own commit series with the styleguide updated in the same PR.

---

## 7. Governance for reuse

- **Naming**: components are React components; variants and states are props rendered as
  data-attributes (`data-variant="danger"`, `data-size="sm"`, `data-state="open"`),
  styled via `[data-*]` selectors under one class per component (`.an-button`). No
  utility-class framework. Tokens: `--an-<tier>-<name>`. App-specific CSS may consume
  `--an-*` tokens but may never define them.
- **Consumption by a future app**: depend on `@forge/ui`, import `tokens.css` once at
  the root, set `data-theme`/`data-density` on the root element, use components. No
  Forge concepts leak: anything needing `CourseDoc`, blocks, or xAPI stays out of
  `packages/ui` permanently.
- **What stays Forge-specific**: course-theme system (`--forge-*`/`--fb-*` and
  `course.theme`), block renderers and canvas, editor composites (rail, outline, insert
  strip, dnd), publish/export flows. Anvil provides the vocabulary; Forge writes the
  sentences.
- **Change control**: token additions are cheap (PR + styleguide update); token renames
  or semantic remaps require an ADR and a major version; component API changes follow
  semver. One review checklist in `contributing.md` gates every DS PR: a11y states,
  dark mode, density, reduced motion, styleguide entry.

---

## Appendix: external references consulted

- W3C DTCG Design Tokens Format Module, first stable version 2025.10
  (designtokens.org/tr/drafts/format/): token file format, $type/$value, aliasing.
- Atlassian Design System elevation foundations and designsystems.surf elevation
  patterns: 4-6 level scales, layered shadows, dark mode surface lightening.
- APCA documentation (git.apcacontrast.com, "APCA in a Nutshell") and 2026 contrast
  guides: Lc targets by text size, WCAG 2 as floor, APCA for ramp design and dark mode.
- Material 3 motion tokens and Carbon/Atlassian motion foundations: duration bands
  (80-360ms), productive vs expressive easing, reduced-motion policy.
- Convention reference points (mined, not copied): Radix Themes/Colors (data-attribute
  styling, 12-step ramps), shadcn/ui (semantic CSS variables), Vercel Geist (type
  pairing, restraint), Shopify Polaris (component doc structure with do/dont).

# Anvil token reference

Source of truth: `packages/ui/src/tokens/anvil.tokens.json` (W3C DTCG format).
Generated outputs: `packages/ui/src/anvil.css` (custom properties, `.anvil`
scope) and `packages/ui/src/tokens.ts` (typed constants). Regenerate with
`pnpm --filter @forge/ui build`. The styleguide (`anvil-styleguide.html`)
renders every value; this file documents naming and intent.

## Tier 1: primitives (never used by components directly for color)

| Group | Tokens | Notes |
| --- | --- | --- |
| `--an-color-cobalt-{50..950}` | 11 steps | Primary ramp; interactive voice. |
| `--an-color-neutral-{0..1000}` | 13 steps | Steel grays, slight cool cast. |
| `--an-color-ember-{50..950}` | 11 steps | Warm accent; progress and emphasis only. |
| `--an-color-{danger,success,warn,info}-{50..950}` | 11 steps each | Status ramps. |
| `--an-space-{0,2,4,6,8,12,16,20,24,32,40,48,64}` | 13 steps | 4px base, emitted as rem. |
| `--an-font-family-{sans,mono}` | 2 | Geist Sans / JetBrains Mono stacks (metric-adjusted fallbacks in fonts.css). |
| `--an-font-weight-{regular,medium,semibold,bold}` | 4 | 400 / 500 / 600 / 700. |
| `--an-font-size-{12,13,14,16,18,20,22,24,28,32,40}` | 11 | rem sizes, px-named. 12px is the absolute floor. |
| `--an-font-line-{12..40}` | 11 | Paired line heights. |
| `--an-font-tracking-{tight,normal}` | 2 | Tight (-0.01em) at display/heading sizes. |
| `--an-type-{display-large..paragraph-small,mono}[-family/-size/-line/-weight/-tracking]` | 12 roles | Composite type roles (Base-style); also `.an-type-*` utility classes and the Heading/Text/Label components. |
| `--an-icon-size-{16,20,24}`, `--an-icon-stroke-regular` | 4 | Icon sizing convention: 16 inline, 20 controls, 24 emphasis; stroke 2. |
| `--an-radius-{xs,sm,md,lg,xl,full}` | 6 | 2 / 4 / 6 / 10 / 16 / 999 px. |
| `--an-elevation-{0..4}` | 5 | Layered shadows: border-tint + key + ambient, neutral-tinted. 0 canvas, 1 cards, 2 raised controls/sticky, 3 popovers/menus, 4 dialogs/drawer/toasts. |
| `--an-duration-{80,120,160,200,280}` | 5 | All 0ms under reduced motion. |
| `--an-ease-{standard,enter,exit,spring}` | 4 | Exits accelerate, enters decelerate. |
| `--an-z-{base,raised,sticky,overlay,modal,toast}` | 6 | Z-index bands. |

Total: 152 primitive tokens plus 12 composite type roles.

## Tier 2: semantics (what components and app CSS use)

| Token | Light | Dark |
| --- | --- | --- |
| `--an-surface-sunken` | neutral-100 | neutral-1000 |
| `--an-surface-base` | neutral-50 | neutral-950 |
| `--an-surface-raised` | neutral-0 | neutral-900 |
| `--an-surface-overlay` | neutral-0 | neutral-800 |
| `--an-text-primary` | neutral-900 | neutral-100 |
| `--an-text-secondary` | neutral-600 | neutral-400 |
| `--an-text-muted` | neutral-500 | neutral-500 |
| `--an-text-inverse` | neutral-0 | neutral-950 |
| `--an-interactive-idle/hover/active` | cobalt-600/700/800 | cobalt-400/300/200 |
| `--an-interactive-selected` | cobalt-50 | cobalt-900 |
| `--an-accent` / `-strong` / `-soft` | ember-500/600/100 | ember-400/300/950 |
| `--an-border-subtle` / `-strong` | neutral-200/300 | neutral-800/700 |
| `--an-focus-ring-color` | cobalt-500 | cobalt-400 |
| `--an-focus-ring` | two-layer ring (surface gap + ring color) | same composition |
| `--an-backdrop` | 40% near-black | 60% near-black |
| `--an-status-{tone}-{fg,bg,border,solid}` | 600(warn 700)/50/200/500 | 400/950/800/500 |

Dark mode: higher elevation = lighter surface (shadows weaken in dark).
Primitives stay constant; only this table remaps.

### Density-aware sizing (remapped by `data-density="compact"`)

| Token | Comfortable | Compact |
| --- | --- | --- |
| `--an-control-sm/md/lg` | 28 / 36 / 44 px | 24 / 32 / 40 px |
| `--an-inset-sm/md/lg` | 8 / 12 / 16 px | 6 / 8 / 12 px |
| `--an-gap-sm/md/lg` | 6 / 8 / 12 px | 4 / 6 / 8 px |

Total: 45 semantic tokens (31 remapped in dark, 9 in compact).

## Tier 3: component knobs

`--an-dialog-width-{sm,md,lg}` (26 / 36 / 48 rem), `--an-drawer-width`
(20rem default, overridable per instance). Kept deliberately small.

## Contrast policy

WCAG 2.2 AA is the compliance floor; APCA Lc targets guided the ramps
(Lc 75+ for 12-13px chrome text, Lc 60+ for body), which is why status `fg`
uses the 600/700 steps on light and 400 on dark rather than the 500 solids.

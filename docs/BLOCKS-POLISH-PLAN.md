# BLOCKS-POLISH-PLAN — screen bar, process slide, timeline options, accent story

From Simon's feedback (2026-07-08). Decisions confirmed: timeline eyebrow
renamed date → label (optional, with migration); timeline gains a per-block
"show all details" option (current toggle behavior stays the default);
accent adoption = Tier 1 structure markers only. The quick-add Presence
regression was fixed separately (d9c63d5).

Schema: features 1, 3, 4 share ONE bump to v1.3.0 with a single migration
(only the timeline rename transforms data; the other two are additive).
Features 2 and 5 are schema-free.

## B1 — Divider variant "screen bar" (S)

A spacer occupying exactly the line variant's footprint (2px content height —
the block is effectively its padding envelope, an empty full-bleed band that
can carry backgroundColor) but rendering nothing visible. Distinct from the
existing "spacer" variant (fixed 1.5/3/6rem heights).

- schemas.ts: divider variants += "screen bar"; empty strict payload schema;
  blockPayloadSchemas.divider entry (satisfies clause enforces it).
- divider.tsx: union member + case rendering
  `<div className="fb-divider-screenbar" aria-hidden="true" />`; default `{}`.
- styles.css: `.fb-divider-screenbar { height: 2px; }`.
- Editor: DividerEditor (payload/miscFamilies.tsx) explicit `case: null`;
  libraryData.ts card "Empty full-width band; use padding and background for
  spacing."
- Fixture: one screen bar block in kitchen-sink. Render-smoke coverage is
  free (registry iteration).

## B2 — Process card slide animation (S)

Direction-aware enter animation on the incoming card (option b from the
evaluation): re-key the card per page, fresh mount runs a keyframe sliding
in from ±28px with easing + fade. No two-card track (variable card heights,
inert bookkeeping, duplicated aria-live — not worth it at this size; a track
is a superset upgrade later if wanted).

- ifsProcess.tsx: `direction: "next" | "prev"` state set in go() (dots too:
  forward jump = next); card gets `key={page.key}` +
  `fb-process-card-enter-${direction}`.
- styles.css process section: fb-process-in-next / fb-process-in-prev
  keyframes (260ms, cubic-bezier(0.22, 0.61, 0.36, 1)); reduced-motion block
  sets animation: none (plain CSS media query — blocks CSS ships in published
  packages, no Anvil tokens).
- A11y: existing aria-live counter already announces step changes. Process
  uses drawer editing (plain Html, not EditableHtml) so the transform can't
  break inline editing; comment noting care if EditableHtml lands here later.

## B3 — Timeline "show all details" option (M)

Current: details collapse behind per-item title buttons; opening every item
completes the block (interaction-gated). New optional payload flag
`detailsAlwaysVisible` — when true, titles are plain headings, all bodies
visible, node dots filled.

- schemas.ts: `detailsAlwaysVisible: z.boolean().optional()` on the timeline
  payload (rides v1.3.0, no transform).
- ifsGraphicTimeline.tsx: branch on the flag; ALSO upgrade the toggle mode's
  instant show/hide to a smooth pure-CSS height animation
  (grid-template-rows 0fr↔1fr wrapper, visibility delayed so collapsed
  content is untabbable; reduced-motion: none).
- CRITICAL gating change: progress.ts consumesByInteraction — timeline with
  detailsAlwaysVisible === true returns false (consumes by scroll like static
  blocks; divider "continue button" precedent). New gating.test.ts case, and
  e2e/player/gating-run.mjs must stay green.
- Editor: ToggleField "Show all details" in TimelineEditor
  (payload/interactiveFamilies.tsx); NOTE the editor currently commits
  `{ events }` only — must spread `{ ...payload, events }` or the flag is
  destroyed on item edits.
- Fixture: one detailsAlwaysVisible timeline block.

## B4 — Timeline date → label rename (M)

Items already have a bold `title`; the small-caps eyebrow above it is `date`.
Rename to `label` and make it OPTIONAL (omit entirely for non-temporal
timelines).

- schemas.ts: `date` → `label: z.string().min(1).optional()`.
- migrations.ts migrate120To130 (the shared v1.3.0 migration): walk timeline
  blocks, `{ date, ...rest } → { ...rest, label: date }`, dropping empties.
  Migration test in index.test.ts.
- ifsGraphicTimeline.tsx: render label only when present; CSS class
  .fb-timeline-date → .fb-timeline-label.
- interactiveFullscreen.tsx defaults; editor field label "Label", optional,
  hint "Optional eyebrow, e.g. 1969 or Phase 1."
- Fixture: date → label. Consumer grep confirmed: exporter/xapi/player never
  touch .date; example/lib is a built artifact.

## B5 — Accent story, Tier 1 (S)

Audit result: course accent (theme.accentColor → --forge-accent →
--fb-accent, default #dd6b20, editable in ThemeEditor, offered in the
selection toolbar swatches) is consumed by exactly three things: the
checklist "Required" pill, one chart palette entry, and the untracked-mode
banner. Anvil's ember accent is deliberately chrome-only (wordmark spark,
progress) and stays that way — the two systems remain separate.

New rule (record in decisions.md): PRIMARY owns actions and reading
affordances (buttons, links, tabs, selected states, impact bands/borders);
ACCENT owns non-interactive energy/structure markers. Correct/incorrect stay
semantic green/red. Callout icons keep their semantic palette.

Tier 1 flips (--fb-primary → --fb-accent in packages/blocks/src/styles.css):
numbered-list circles + bulleted dots; divider numbered circle; process
counter count, step circle, active dot; timeline spine, node border/fill,
eyebrow label; labeled-graphic markers + pulse. (Checklist pill becomes
consistent instead of orphaned.)

Supporting: add `--fb-accent-contrast: var(--forge-accent-contrast, #ffffff)`
beside the other fb tokens and use it inside accent-filled circles; editor
Canvas.tsx themeVars does NOT set --forge-accent-contrast today (player
chrome.tsx does via readableTextOn) — add it for canvas parity.

Compat note (accepted): existing courses shift these markers from blue to
orange (defaults) on republish. CSS-only, trivially reversible.

## Sequencing + gates

1. B1+B3+B4 together (one v1.3.0 bump/migration): schema → blocks → editor →
   player gating → fixtures/tests.
2. B2 (blocks-only).
3. B5 (CSS + one Canvas line + decisions.md entry).

Per PR: per-package tsc, node scripts/contract-check.mjs,
node e2e/smoke/render-smoke.mjs, node e2e/exporter/build-run.mjs,
node e2e/player/gating-run.mjs; vitest (pnpm -r test) on the Mac. Blocks CSS
changes require `pnpm -F @forge/player build:runtime` on the Mac before
published packages reflect them. Contract rule 6: no star-slash in CSS
comment bodies.

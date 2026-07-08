# POLISH-PLAN — Visual pass 2 + D6

Covers Simon's nine items (2026-07-08) plus D6 dark mode. Produced from four
parallel planning agents (A: content model and theming; B: rich text toolbar;
C: editor chrome UX; D: beautification). Governing references: docs/SPEC.md,
docs/reference/rise-teardown.md, docs/DESIGN-SYSTEM-PLAN.md,
docs/design-system/decisions.md, scripts/contract-check.mjs.

Item map: 1 → V3.1, 2 → V3.2, 3 → V5, 4 → V4, 5 → V2, 6 → V3.3, 7 → V1.1,
8 → V1.2, 9 → V1.3, D6 → V1.4.

---

## V0 — Schema v1.2.0 foundation (do first; unblocks V2 and V3)

One version bump carries every schema change in this plan. Current:
`CURRENT_SCHEMA_VERSION = "1.1.0"` in packages/schema/src/schemas.ts;
migration registry in packages/schema/src/migrations.ts (append
`migrate110To120`).

Additions to `courseDocSchema`:

- `cover: courseCoverSchema.optional()` — `{ mediaId, layout: "cover" | "hero",
  overlayOpacity?: int 0-100 }` (Rise models this as coverPageType +
  coverImageAlpha in docs/reference/course.json; validates the design).
- `descriptionHtml: htmlFragmentSchema.optional()` — rich description.
  `description` (plain string) STAYS as the canonical plain-text projection:
  it feeds tincan.xml. Editor keeps both in sync on commit (strip tags to
  plain text). Migration never back-fills descriptionHtml.

Change to `blocksLessonSchema`: replace `headerImage: mediaIdSchema.optional()`
with `header: { imageMediaId?, backgroundColor?, overlayOpacity? }.optional()`.
Migration moves `headerImage` → `header.imageMediaId`. This is the only
non-additive change; every load path must run migrateCourseDoc (verify
editor persistence/courseLifecycle do; published packages embed
schema-matched data so standalone.tsx is unaffected).

Sanitizer changes (packages/schema/src/sanitizer.ts) for the V2 toolbar:

- allowedTags += `mark`.
- allowedAttributes: `span: [style, data-color, data-highlight]`,
  `mark: [data-color, style]`, `p/h2/h3/h4/li: [style]`.
- New `isSafeStyleAttribute(tag, value)`: per-tag property allowlist with
  strict value regexes — color/background-color (hex/rgb only), font-size
  (px), font-family ([A-Za-z0-9 ,'"-]+), text-align (left|center|right),
  line-height (unitless number). Reject `url(`, `\`, `expression`, `@`.
  Wired into isSafeHtmlFragment's attribute loop.
- Tests in packages/schema/src/index.test.ts (positive + injection cases).

Ripples (same change): kitchen-sink fixture bumped to 1.2.0 with cover,
descriptionHtml, and header.backgroundColor samples so every e2e script
exercises the new fields; migration test for the headerImage move; exporter
packages/exporter/src/compile.ts — collectMediaUses picks up
`course.cover.mediaId` and `lesson.header?.imageMediaId`, and the published
allowlist object gains `cover` + `descriptionHtml` (NOTE: `author` is
missing from that allowlist today even though Cover.tsx renders it — fix in
passing). crdt.ts: descriptionHtml syncs as a plain Yjs value (LWW) — noted,
acceptable.

Size: M. Verify: pnpm -r build, pnpm -r test, node scripts/contract-check.mjs,
node e2e/exporter/build-run.mjs.

---

## V1 — Editor chrome UX (items 7, 8, 9 + D6) — no schema deps, ships first

### V1.1 Settings tray on demand (item 7) — M

Today EditorScreen.tsx derives tray visibility from `selectedBlockId !== null`;
clicking a block opens it. New model:

- Click = select only (ring + rail). New `settingsOpen: boolean` in the
  zustand store; tray opens only via the rail's existing SlidersHorizontal
  button (rewired to new `openBlockSettings(id)`).
- Auto-open on INSERT only for config-heavy families (image, gallery,
  multimedia, audio, chart, table, interactive, buttons, knowledgeCheck) via
  a `shouldAutoOpenSettings(family)` predicate shared by insertBlock and
  insertBlockVariant. Text-like inserts select only. Duplicate never opens.
- Close: tray X (`closeBlockSettings()`, keeps selection), Escape, lesson
  switch, overview, deleting the selected block, clicking empty canvas.

Files: state/store.ts, state/actions.ts, state/libraryActions.ts, new
state/settingsPolicy.ts, ui/EditorScreen.tsx, ui/BlockEditFrame.tsx,
ui/SettingsPanel.tsx, ui/Canvas.tsx (background deselect).

### V1.2 Evergreen insert indicator (item 8) — S

fe-insert-btn is invisible at rest today (opacity 0, hover-revealed). Rise
teardown line 148: visible plus between every block. New rest state:

- Between blocks: slim hairline (content-column width, 46rem inset, matching
  the lesson title inset) in `--an-border-strong` at ~0.45 opacity with a
  small 16px neutral "+" disc (Anvil surface/muted tones — reads as editor
  chrome, not course content). Hover/focus intensifies to today's 26px
  --forge-primary button; motion via --an-duration-120.
- End of lesson: always-visible full-strength affordance, optionally a
  labeled "Add block" pill.

Files: ui/Canvas.tsx (InsertAffordance gains `terminal` prop + line spans),
ui/styles.css (.fe-insert section rework). QuickAddStrip anchoring unchanged.

### V1.3 Collapsible outline (item 9) — M

- Topbar panel-left button (today hidden ≥900px) becomes the universal
  toggle: desktop collapse/expand, mobile overlay. aria-expanded on it.
- New .fe-outline-header row ("Outline" + collapse chevron IconButton).
- Keyboard: Cmd/Ctrl+\ (Cmd+B is reserved for V2 bold).
- Collapsed = width 0 + inert (same pattern as .fe-drawer); inner panel keeps
  260px so rows don't squash; transition on --an-duration-200; covered by the
  existing prefers-reduced-motion block.
- Persist via localStorage key `forge-outline-collapsed` — UI prefs are fine;
  contract-check rule 5 only bans keys/args containing "course".
- Layout contract safe: no max-width/padding added to the band chain;
  full-width blocks reclaim the 260px automatically (drawer already proves
  the mechanism).

Files: new ui/uiPrefs.ts (shared with V1.4), ui/EditorScreen.tsx,
ui/TopBar.tsx, ui/Outline.tsx, ui/styles.css (scoped min-width media query).

### V1.4 D6 dark mode toggle — M

Token layer already complete (`.anvil[data-theme="dark"]` remap in anvil.css).

- ThemeToggle component (sun/moon icons exist in @forge/ui): mounted in
  TopBar + OverviewHeader. Sets data-theme on the `.anvil` root in App.tsx.
- Default follows OS (matchMedia prefers-color-scheme, live listener);
  explicit choice persists to localStorage `forge-ui-theme`.
- Canvas stays author-themed: .fe-canvas-lesson paints --forge-bg and blocks
  read only --forge-/--fb- tokens, so the WYSIWYG paper does NOT invert —
  intended (Rise/Figma behave the same).
- Audit found one real bug: .fe-inline-error hardcodes a light red chip in
  inline.css → retoken to --an-status-danger-*. Preview overlay's dark stage
  stays as-is.
- Optional: `color-scheme: dark` in the dark token block (build.ts) +
  `color-scheme: light` on the canvas so native widgets match.
- State: `uiTheme` in the zustand store + toggleUiTheme action.
- Coordinates with V5.2 (dark elevation remap) — dark mode is USABLE after
  V1.4 but gets its depth back in V5.

Files: ui/uiPrefs.ts, new ui/ThemeToggle.tsx, ui/App.tsx, state/store.ts +
actions.ts, ui/TopBar.tsx, ui/overview/OverviewHeader.tsx, inline/inline.css,
optional packages/ui/src/tokens/build.ts (+ regen anvil.css + styleguide).

Sequencing inside V1: V1.1 → V1.3 (both edit EditorScreen) → V1.4 → V1.2.

---

## V2 — Rich text selection toolbar (item 5) — L

Rise-style two-row bubble toolbar on text selection, shared by the inline
canvas editor and the drawer RichTextField. Everything is Tiptap 2.27.2
(installed line); BubbleMenu already ships in @tiptap/react (tippy-based,
zero new positioning deps).

USER ACTION REQUIRED (sandbox registry blocked):

    pnpm --filter @forge/editor add \
      @tiptap/extension-text-style@2.27.2 \
      @tiptap/extension-color@2.27.2 \
      @tiptap/extension-highlight@2.27.2 \
      @tiptap/extension-text-align@2.27.2 \
      @tiptap/extension-font-family@2.27.2

v1 feature set — row 1: font family (Select), paragraph style (Normal/H2/H3/
H4/Quote), font size stepper, text color, highlight, B I U S. Row 2: sub/
superscript, link (popover), align L/C/R, numbered/bulleted list, indent/
outdent, line spacing (1/1.15/1.5/2), inline code, clear formatting.
Cut from v1: formula/math (KaTeX in published player = big payload; defer),
Rise's [0] variable chips (no variable system), justify, H1 (reserved for
lesson titles), cursor tool (meaningless here).

Serialization rule: semantic tags where the sanitizer already allows them
(strong/em/u/s/sub/sup/a/code/lists/h2-4/blockquote), inline styles for
continuous values (color, font-size px, font-family full curated stack,
text-align, line-height). Renders identically in published packages with
zero editor code. Blocks CSS additions: `.fb-html mark` + deterministic
`.fb-html ul/ol` margins → requires a `pnpm -F @forge/player build:runtime`
to reach published output.

Custom mini-extensions (no deps): FontSize (~30 lines, textStyle global
attribute) and LineHeight (~35 lines, paragraph/heading attribute) — the
official font-size extension is v3-only.

UI: new ui/rich/SelectionToolbar.tsx + selectionToolbar.css composed from
Anvil Toolbar/IconButton/Select/Popover/Menu/Tooltip; lucide icons all
present. BubbleMenu with appendTo: document.body (escapes .fe-canvas
clipping), selection-survival via onMouseDown preventDefault + stored
selection range + interacting latch for focus-stealing controls.

Consolidation wins (the "back off fe-settings" payoff):

- SettingsPanel: remove the textColorMode control (schema field stays valid;
  UI only). Format section shrinks to padding, background color, anchor.
- RichTextField's static TOOLBAR_ACTIONS row and InlineHtmlEditor's
  INLINE_ACTIONS toolbar are deleted — both surfaces get the bubble menu.
- InlineHtmlEditor is refactored to extract a commit-agnostic InlineRichText
  core (props: html, onCommit, className) — the block adapter keeps the
  setAtPath/validatePayload flow; V3.2 consumes the core for the course
  description.

Paste hygiene: stripStyleAttributes becomes allowlist-aware (reuses the
schema's isSafeStyleAttribute) instead of stripping all styles.

Font list seam: ui/rich/fontOptions.ts reads the catalog module from V4;
until V4 lands it mirrors the existing FONT_STACKS names.

Also: scripts/make-standalone.mjs CDN map gains the five new packages.

Files: schema sanitizer (in V0), ui/rich/richTextConfig.ts, new
extensions/fontSize.ts + lineHeight.ts, SelectionToolbar.tsx,
InlineHtmlEditor.tsx, RichTextField.tsx, inline/inline.css,
blocks/src/styles.css, SettingsPanel.tsx, make-standalone.mjs.

Risks: bubble menu hiding on native-control focus (mitigated above);
getHTML attribute-order churn vs debounce equality (normalize first);
tippy v6 deprecated upstream (fine pinned to Tiptap v2).

---

## V3 — Title screen + lesson header (items 1, 2, 6)

### V3.1 Course cover background (item 1) — M

- Player Cover.tsx: `layout: "hero"` renders the image above the title
  (full column, radius, max-height clamp ~40vh, object-fit cover; alt="" —
  decorative). `layout: "cover"` paints fp-cover-screen with the image +
  dark scrim (same linear-gradient pattern as LessonHeader), opacity from
  overlayOpacity (default 55), white text via fp-cover-screen-image
  modifier. fp- CSS only.
- Editor CourseOverview: CoverControl section — MediaPicker (exists),
  SegmentedControl (exists) for cover|hero, opacity range shown for cover.
  New setCourseCover action following the setTheme pattern.
- Exporter covered by V0. Honest preview = PreviewOverlay.

### V3.2 Rich, sanely-aligned description (item 2) — M

- Editor: CourseMeta's textarea replaced by a rich editor built on V2's
  InlineRichText; commit = sanitize → setCourseMeta({ descriptionHtml,
  description: plainTextOfHtml(html) }).
- Player Cover.tsx renders descriptionHtml through the shared `<Html>` from
  @forge/blocks; falls back to the plain <p>.
- Alignment: .fp-cover keeps centered display elements (logo/title/meta/
  button); .fp-cover-description becomes text-align: start with a 34rem
  measure, centered as a column. (Taste call — flag at review.) Alignment
  is also directly authorable via the V2 toolbar since descriptionHtml is
  rich.

### V3.3 Lesson header background (item 6) — S/M

- Player chrome.tsx LessonHeader matrix: image only (current, scrim opacity
  now authorable); color only (backgroundColor + readableTextOn for text,
  fp-lesson-header-tinted modifier using currentColor-derived alphas for
  counter/author); both (color behind, image+scrim on top).
- Editor: no lesson-settings surface exists today — add a compact "Header"
  button next to the canvas lesson title opening a Popover/small Dialog:
  MediaPicker, hex color row (ThemeEditor pattern), opacity, Remove. New
  setLessonHeader action.
- Exporter covered by V0 (regression-check: header image still lands in
  assets/ after the rename — e2e/exporter/build-run.mjs).

Order inside V3: V3.3 (proves the migration) → V3.1 (reuses the scrim
pattern) → V3.2 (needs V2's InlineRichText).

---

## V4 — Theme font catalog + embedded WOFF2 (item 4, absorbs U6) — L

Catalog additions (all SIL OFL, all with static latin WOFF2 on the
Fontsource CDN the Geist fetch script already uses):

- Serif (4): Lora, Source Serif 4, Libre Baskerville, Spectral.
  (Merriweather + Playfair Display already exist in FONT_STACKS.)
- Sans (5): Work Sans, IBM Plex Sans, Karla, Nunito Sans, Manrope.
  (Inter, Lato, Roboto, Open Sans, Montserrat, Nunito, Source Sans exist.)

Architecture — packages/player/src/fonts.ts becomes the single font
authority (editor already imports fontStackOf from @forge/player; exporter
untouched):

- `courseFontCatalog`: name, category (serif|sans|system), fontsourceId
  (absent = system face, never embedded), weights [400, 700], full fallback
  stack. fontStackOf gains the nine new stacks.
- `fontFilesFor(theme)` (deduped across heading/body/ui) and
  `buildFontFaceCss(files)` (deterministic, sorted, url("fonts/<file>")).
  Pure data/string functions — node-testable like render-smoke.

Pipeline:

1. New packages/player/scripts/fetch-course-fonts.mjs (clone of the Geist
   fetcher; PIN Fontsource versions, not @latest) → 400+700 for every
   catalog face (~36 files) into packages/player/public/fonts/. Run on the
   Mac.
2. build:runtime copies fonts into editor public/player-runtime/fonts/
   (vite publicDir, or a copy step appended to the npm script).
3. publishAction.ts: compute fontFilesFor(course.theme), fetch each
   /player-runtime/fonts/<file>, push into playerAssets as fonts/<file> +
   a generated fonts.css. buildIndexHtml already links every lib .css, so
   lib/fonts.css loads for free; @font-face urls resolve relative to it.
   Missing file ⇒ font_missing warning (player_css_missing pattern), ship
   with fallback stacks. Zip stays deterministic. NO exporter changes.
4. Editor canvas + preview: checked-in course-fonts.css with @font-face
   pointing at /player-runtime/fonts/, imported from main.tsx —
   canvas/preview render real faces.
5. Self-containment intact: nothing touches --an-; contract-check green.

Editor UI: ThemeEditor's three free-text typeface Inputs become Selects
built from the catalog + System group; unknown stored values render as an
extra option (no font migration needed — theme stays z.string()).

Also fix in passing: Canvas themeVars doesn't map --forge-ui-font (chrome.tsx
does) — close the gap.

Size impact: typical package +40-60 KB (heading=body), worst ~150 KB; editor
public/ grows ~2 MB (never ships to learners). Italics excluded (browsers
synthesize; revisit for serifs if ugly).

V2's toolbar font dropdown consumes the catalog via fontOptions.ts.

---

## V5 — Beautification (item 3) — the "not built by AI" program

Audit verdict: the bones (elevation ladder, motion tokens, hover lifts) are
good; the bareness is ten specific tells — zero gradients anywhere (the only
one in chrome CSS is the skeleton shimmer), no brand moment (topbar starts
with two anonymous IconButtons; course list brand is a bare h1; the ember
accent ramp is consumed by exactly one progressbar), two competing primary
CTAs (Preview + Publish), double edges (border + elevation ring on the same
cards), dark mode with invisible shadows (elevations not remapped), bare
empty/loading states (Skeleton and Toast components exist and are consumed
by NOTHING), border-color-only input focus, off-token spacing litter
(overview.css 15px/18px/10px, publish.css raw rems, inline.css legacy --fe-
bridge), uniform gray iconography, and static topbars.

All changes land as Anvil tokens first (anvil.tokens.json + build.ts →
regenerated anvil.css/tokens.ts; build.ts ShadowPart gains `inset?: boolean`),
then components.css, then fe-/fp- adoption — future apps inherit everything.

### Wave 5A — quick wins (biggest visible delta)

- 5A.1 Brand moment (M): Wordmark component in @forge/ui — anvil glyph in a
  rounded square filled with new `--an-brand-gradient` (cobalt 500→700) +
  ember `--an-accent-gradient` spark facet. Adopt: topbar leading slot
  (glyph, 24px), OverviewHeader, CourseList (full wordmark replaces bare h1).
  The ember ramp finally earns its place.
- 5A.2 CTA hierarchy (S): Preview demotes to secondary; Publish is the sole
  primary; vertical dividers group [undo/redo] | [theme/labels/device] |
  [preview/publish].
- 5A.3 Machined buttons (S): bevel tokens --an-bevel-highlight (inset 1px
  white 14%) + --an-bevel-edge composed onto primary/danger buttons.
  Full gradient fills REJECTED (banding; Base/Linear use near-flat + bevel).
- 5A.4 Input focus glow (S): --an-focus-glow (3px soft tinted halo, 18%
  light / 28% dark) on inputs/textareas/selects; danger-tinted when invalid.
  Keyboard focus ring untouched (a11y contract).
- 5A.5 Empty states with a face (S): .an-empty-icon halo treatment (radial
  tint disc + concentric ring); Canvas's bare "lesson is empty" <p> becomes
  a real EmptyState with an "Add a block" action; CourseList empty state
  gains a New course action. Bespoke illustrations REJECTED for now.
- 5A.6 Activate dormant feedback (M): course-list loading becomes Skeleton
  card grid; Toast host wired into App root for publish success / create-
  open failures / conflict recovery outcomes (persistent conflict banner
  stays a banner).
- 5A.7 Course cards (S): 6px brand-gradient cover strip + lesson-count row
  with icon.

### Wave 5B — depth system and rhythm

- 5B.1 Dark elevation remap (M): elevations move into the semantic maps;
  dark variants swap the border-tint ring to rgba(255,255,255,0.07) and
  deepen alphas ~1.5x. Highest-impact dark fix; everything inherits it.
  (Completes V1.4.)
- 5B.2 Scroll-aware topbar (S/M): idle = flat + hairline; elevation-2 fades
  in when the canvas scrolls (data-scrolled, rAF-throttled).
- 5B.3 Border/shadow rationalization (M): rule — raised surfaces get
  elevation (its ring IS the border); hairlines only divide regions within
  a surface. Library cards drop their border; settings sections separate by
  spacing; new --an-border-faint for dialog header/footer. Log as a
  decisions.md entry.
- 5B.4 Overlay polish (S): --an-backdrop-blur: 4px on dialog backdrop +
  library scrim (@supports-guarded); popover entrance on --an-ease-spring
  with per-placement transform-origin.
- 5B.5 Token rhythm sweep (M/L): retoken overview.css, publish.css,
  library.css, dialogs.css; migrate inline.css off the legacy --fe- bridge
  and DELETE the bridge block (finishes the D3 leftover).
- 5B.6 Library personality (M): per-category tint pairs on card thumbs via
  data-cat (text→cobalt, media→info, interactive→ember, quiz→success — all
  existing primitives), spring icon scale on hover, 2px active indicator on
  the rail. Duotone icon re-vendor REJECTED (104-asset cost, marginal gain).

### Wave 5C — signature moves

- 5C.1 Accent story codified (S): cobalt = interactive, ember = brand energy
  + progress; save Badge tone crossfade.
- 5C.2 Player chrome flair (M): value-copied bevels on .fp-button, topbar
  scroll shade, sidebar active pill (--forge-primary 8% fill) — fp- values
  with an- provenance comments; entrance timings LOCKED.
- 5C.3 Micro-interaction pass (S): row-action fades, menu-item transitions,
  iconbutton active scale — all duration-token based (reduced-motion free).
- 5C.4 Styleguide + decisions.md entries for everything above; regenerate
  anvil-styleguide.html.

Rejected outright: gradient button fills, light-mode card sheens, floating
"paper card" canvas (violates the full-bleed band contract), duotone icons,
noise textures.

---

## Cross-cutting risks

- The headerImage → header rename is the only breaking migration; every
  editor load path must call migrateCourseDoc. e2e exporter run guards the
  asset regression.
- description/descriptionHtml dual source of truth — single commit path in
  the editor is the mitigation.
- Both V2 and V3.2 touch InlineHtmlEditor: V2 owns the InlineRichText
  extraction; V3.2 consumes it. Serialize.
- V1.1 + V1.3 both edit EditorScreen.tsx; V2 + V5A.2 + V1.4 all touch
  TopBar.tsx. Serialize within waves as noted.
- contract-check rule 6: no `*/` inside any CSS comment body — write token
  family prose as "--forge- and --fb-".
- Anything touching packages/blocks or packages/player CSS needs
  `pnpm -F @forge/player build:runtime` on the Mac before published
  packages reflect it.
- New deps (V2) and font fetches (V4) need Simon's Mac (sandbox registry
  blocked).

## Verification recipe (every wave)

    pnpm -r build && pnpm -r test
    node scripts/contract-check.mjs
    node e2e/smoke/render-smoke.mjs
    node e2e/exporter/build-run.mjs   (waves touching schema/exporter)
    node e2e/player/gating-run.mjs    (waves touching player)
    node scripts/make-styleguide.mjs  (waves touching @forge/ui)

Plus manual checklists per feature (documented inline above) and a published-
package smoke in Stream Curatr after V4 (fonts) — offline zip, no network.

## Proposed execution order

V0 → V1 (chrome UX + dark mode, immediate feel win) → V5A (beautification
quick wins — pairs with V1.4 since dark needs 5B.1 soon after) → V2 (toolbar;
needs Simon's pnpm add) → V3 (cover/description/header) → V4 (fonts; needs
Simon's fetch run) → V5B → V5C.

Alternative if the "bare" feeling is the top priority: V5A before V1.

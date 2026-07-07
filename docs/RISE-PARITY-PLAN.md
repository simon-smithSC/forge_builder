# Rise Parity Plan (R4)

Date: 2026-07-07
Requirements source: `docs/reference/rise-teardown.md` (live teardown of Rise 360 Example Course).
Diff target: Forge at end of R3 (schema, shared renderers, editor on CourseDoc, TipTap fields, dnd-kit, quiz editor, media picker, theme/labels, xAPI runtime + exporter).
All teardown citations below are section names plus line ranges in `docs/reference/rise-teardown.md`. All Forge citations are actual file paths.

## 1. How Rise feels vs how Forge feels today

Rise is direct-manipulation-first. The teardown's executive summary (lines 9-23) is blunt: "Rise is not a form-first editor." The author works on a live learner-shaped page, clicks text and types into it in place (Direct Editing, lines 196-208), and every block carries its own contextual rail of Block Selector / Content / Style / Format / Move / Duplicate / Delete (Contextual Block Rail, lines 164-179). The right drawer opens only for secondary and structural settings, and it is titled for the exact variant, for example `Edit Paragraph with heading` (Right Drawer, lines 181-194). Forge today inverts this. The canvas does render the real shared renderers (`packages/editor/src/ui/Canvas.tsx` mounts `BlockView` from `@forge/blocks`), so WYSIWYG fidelity is real, but ALL content editing routes through the right `SettingsPanel` form (`packages/editor/src/ui/SettingsPanel.tsx` line 198-201 wraps `PayloadEditor.tsx`). To change a paragraph the author selects the block, then types into a TipTap field inside a side panel (`packages/editor/src/ui/rich/RichTextField.tsx`), watching the canvas update at arm's length. That inversion is the number one gap.

The second structural difference is block-adjacent control. Rise attaches a compact icon rail to the block itself and keeps the drawer variant-specific; Forge shows a single horizontal hover toolbar across the block top (`packages/editor/src/ui/BlockEditFrame.tsx`: grip, family label, a raw `<select>` for variant, move/duplicate/delete) and a one-size settings panel whose first section is envelope padding/color/anchor for every family (`SettingsPanel.tsx` `EnvelopeSettings`). Rise's insertion model is also richer: plus buttons between every block open a quick-add strip of eight common blocks plus an entry into a full library with a left category rail and visual variant cards (Block Creation Model lines 146-162, Block Library lines 276-337). Forge's plus opens a centered search modal with text-only labels (`packages/editor/src/ui/BlockPalette.tsx`).

The third difference is theme presence. In Rise the course theme saturates both authoring and preview: the `#ff631e` accent paints statement/quote bands, continue buttons, checkmarks, tab underlines, and the sidebar progress readout (Theme in Preview lines 243-251, Learner Progress lines 253-259). Forge's theme variables flow correctly through `Canvas.tsx` `themeVars()` and `packages/blocks/src/styles.css` (`--fb-primary` and friends), and buttons/markers/timelines already use `var(--fb-primary)`, but blocks are capped at `max-width: 46rem` inside `.fb-block` (`packages/blocks/src/styles.css` lines 5-19), so nothing renders as a full-bleed color band, and statement variants use surface tints rather than the loud theme-color bands the reference shows. Forge feels like a competent document editor with a preview; Rise feels like editing the course itself. Closing that feeling is what R4 is for.

## 2. Gap register

Severity: none / minor / major / missing.

### 2.1 Surfaces

| Surface | Rise behavior (teardown) | Forge today | Gap | Action |
|---|---|---|---|---|
| Course overview | Top-level hub: editable title/description, author name, section/lesson outline with type markers, `Edit Content` links, inline empty-title inputs, `Shift + Enter to add as a section`, editing-ownership banner (Course Overview Screen, lines 40-107) | `packages/editor/src/ui/CourseList.tsx` is a card grid (title, lesson count, updated date) that jumps straight into the editor; no overview screen, no description/author editing outside TopBar title input | major | P6: new CourseOverview screen between CourseList and EditorScreen |
| Editor shell + outline | Lesson-scoped editor; header has lesson dropdown for switching lessons, back to overview, preview (Lesson Authoring Screen, lines 109-144) | Three-region shell per SPEC 4.1: persistent `Outline.tsx` sidebar + `Canvas.tsx` + `SettingsPanel.tsx`, TopBar with course title/undo/theme/publish (`packages/editor/src/ui/EditorScreen.tsx`) | minor | Keep three-region shell (deliberate improvement); add lesson dropdown affordance in P6; make canvas lesson title editable in place (P1) since `Canvas.tsx` line 158 renders a static `<h1>` |
| Block insertion | Visible plus between every block; plus opens quick-add strip (Block library, Text, List, Image, Video, Process, Flashcards, Sorting, Continue) then full library (Block Creation Model, lines 146-162) | `Canvas.tsx` `InsertAffordance` renders plus-between; it opens `BlockPalette.tsx`, a centered search modal, text-only entries, no quick-add tier, no thumbnails | major | P4: quick-add strip + full library side panel |
| Full block library | Side panel, left category rail (Text, Statement, Quote, List, Image, Gallery, Multimedia, Interactive, Knowledge check, Chart, Divider, Block templates, Code, Custom block Beta), right visual variant cards (Block Library, lines 276-337) | `BlockPalette.tsx` groups by 6 registry groups (`GROUP_LABELS`), one button per family, no per-variant cards, no category rail | major | P4: category rail mapped to teardown categories, variant-level preview cards |
| Contextual block rail | Per-block rail: Block Selector, Content, Style, Format, Move up/down (context-aware at ends), Duplicate, Delete; attached to the block (Contextual Block Rail, lines 164-179; Global Block Behaviour, lines 339-382) | `BlockEditFrame.tsx` hover toolbar: drag grip, family label, variant `<select>`, move/duplicate/delete. No Content/Style/Format entry points, no block-type selector chip, variant switch is a bare dropdown | major | P2: replace toolbar with Rise-style rail |
| Right edit drawer | Opens per control, titled per variant (`Edit Paragraph with heading`), block-specific fields only, block stays visible (Right Drawer, lines 181-194; Settings Should Be Specific, lines 1221-1224) | `SettingsPanel.tsx` always leads with generic `EnvelopeSettings` (padding, background, text color, anchor) then a Content section; header is `label / variant` slug | major | P3: retitle per variant, content-specific first, envelope demoted to Format/secondary |
| In-place editing | Rich text edited directly in the block via TipTap/ProseMirror (`tiptap ProseMirror rise-tiptap`); lesson title is a textarea on the canvas (Direct Editing, lines 196-208) | Zero in-place editing. All text edits go through `RichTextField.tsx` inside the drawer forms under `packages/editor/src/ui/payload/` | missing | P1: inline editing port through `RenderContext` |
| Learner preview / player chrome | Outer shell (back/Edit) + iframe: sidebar with course title, `0% COMPLETE`, section labels, lesson list; lesson header `Lesson 1 of 2` and `By Simon Smith`; theme-bound (Learner Preview Screen, lines 210-274) | `PreviewOverlay.tsx` mounts the real `packages/player/src/Player.tsx`: cover, sidebar (`SidebarNav.tsx` with text checkmark/lock glyphs), progress model, sequential locks. No percent readout in sidebar, no `Lesson x of y`, no author line, no progress ring | minor | P7: chrome parity pass |
| Theme application | `#ff631e` accent on statement bands, continue buttons, checkmarks, progress, tab underline; Merriweather body, Lato headings (Theme in Preview, lines 243-251) | Theme vars plumbed end to end (`Canvas.tsx` `themeVars`, `packages/player/src/chrome.tsx` `themeStyleOf`, `packages/blocks/src/styles.css` tokens); buttons/markers/tabs use `--fb-primary`. But no full-bleed bands (`.fb-block` max-width caps background), impact variants tint instead of saturate, checkmarks are text glyphs | major | P5: full-bleed envelope wrapper + accent saturation pass |
| Quiz authoring + learner quiz | Knowledge checks: authoring shows question stem, options, correct-answer radios, feedback; learner gets SUBMIT / incorrect state / TAKE AGAIN, correct answers never preselected (Knowledge Check, lines 858-905) | Authoring: form-based `packages/editor/src/ui/quiz/QuizLessonEditor.tsx` (+ QuestionCard/QuestionEditor/ChoiceEditors), 7 question types. Learner: `packages/blocks/src/families/knowledgeCheck.tsx` and `packages/player/src/quiz/QuizLessonView.tsx` fully operable with submit/feedback/retry via labels | minor | Quiz lesson form is acceptable (Rise quiz lessons are also form-like); restyle question cards toward Rise look in P5; no engine work needed |

### 2.2 Per-block visuals and variants (Block And Variant Teardown, lines 384-1109)

| Family (teardown) | Rise notes | Forge today | Gap | Action |
|---|---|---|---|---|
| Text (386-421) | Heading and body as separate inline editables; variants visibly distinct; optional audio via `Add audio` in drawer | `packages/blocks/src/families/text.tsx`: 6 variants render distinctly; no inline editing; NO audio field in schema payload (`packages/schema/src/schemas.ts` text payloads) | major | P1 inline fields; ADR for optional `audioMediaId` on text payloads; type scale polish in P5 |
| Statement (423-446) | High-impact standalone text, prominent framed/scaled treatments | `families/impact.tsx` variants a-d + note; treatments exist in `styles.css` (lines 102-143) but are timid: no full-bleed theme-color band variant | major | P5: band-style variants using theme primary, larger scale |
| Quote (448-471) | Own library category; quote text + attribution, styled distinctly from statement | Folded into `impact` via optional `attribution` (`schemas.ts` `impactPayloadSchema`); no dedicated quote presentation (photo/background variants absent) | major | P4 surfaces Quote as a library category mapped to impact variants; P5 adds quote-styled variant(s); note in ADR if new variants added |
| List (473-502) | Numbered, bulleted, checkbox render differently everywhere | `families/list.tsx`: all 3 variants, checkbox interactive, distinct markers | minor | P1 inline item editing; P5 spacing polish only |
| Image (504-532) | Media-first workflows, alt/caption/layout; URL-only entry insufficient | `families/image.tsx`: 5 variants, alt required by schema, caption, zoom lightbox; media picker exists (`packages/editor/src/ui/dialogs/MediaPicker.tsx`) | minor | P5: caption typography, hero/banner treatments vs reference; no crop/focal (SPEC 4.2 backlog, not R4) |
| Gallery (534-560) | Carousel `1 of 2` + grid variants, item-level management | `families/gallery.tsx`: carousel with counter/wrap-around + 2/3/4 col grids; item CRUD in `payload/mediaFamilies.tsx` | minor | P5: carousel control styling to match reference |
| Multimedia (562-613) | Video (provider embeds w/ title/description/`VIEW ON VIMEO`), embed, attachment, code w/ Copy | `families/multimedia.tsx`: video (file-based + captions + transcript), embed iframe, attachment w/ size, code w/ copy + line numbers | minor | Embed covers Vimeo/YouTube by URL; provider-card treatment (title/desc/link) is a P5 nice-to-have; attachment empty-state text in P5 |
| Process (615-648) | `1 of 4 Introduction`, START, steps, summary, START AGAIN; sequential state | `families/interactiveFullscreen.tsx` ProcessView: intro/steps/optional summary, prev/next, `1 / N` counter; no START / START AGAIN framing | minor | P5: start and restart affordances + step chip styling |
| Accordion (650-678) | Expandable headers, works in preview/export | `families/interactive.tsx` AccordionView: ARIA, open/close, completion on all-opened | none | P5 visual polish only |
| Tabs (680-710) | Live tab state, keyboard accessible, active styling | `families/interactive.tsx` TabsView: roving tabindex, arrow keys, active underline via `--fb-primary` | none | P5 visual polish only |
| Labeled graphic (712-749) | Markers with plus icon + viewed state; bubble with next/previous/close | `families/interactiveFullscreen.tsx` LabeledGraphicView: coordinate markers, popover with close; NO next/previous in bubble, no viewed-state styling | minor | P5: bubble prev/next, viewed marker state |
| Sorting (751-782) | Current-item presentation, categories, state | SortingView: item rows with pile buttons, check/retry, per-item feedback. Different interaction shape (all items at once vs one at a time) but functionally complete | minor | P5: optional card-at-a-time presentation; payload already supports it |
| Timeline (784-815) | Date, title, body event stack with vertical rhythm | TimelineView: dated events on a themed vertical line, expandable bodies | none | P5 polish only |
| Flashcards (817-856) | Grid + stack, flip, `1 of 3` counter, `Click to flip` | `families/flashcard.tsx`: single/grid/stack, flip state, counter. Flip is a style swap, not a 3D flip; no `Click to flip` hint | minor | P5: flip animation (respect reduced motion) + hint label |
| Knowledge check (858-905) | MC, MR, fill-in-blank; submit/incorrect/take-again; answers not revealed | `families/knowledgeCheck.tsx`: those 3 plus matching; feedback panel, retry, no preselected answers | none | P5: option/submit styling to Rise proportions |
| Chart (907-946) | Bar/line/pie, titles, accessible data instruction | `families/chart.tsx`: bar/line/pie SVG, legend, data-table toggle | none | P5: theme-colored default series |
| Divider (948-976) | Continue gates progress; numbered divider; spacer | `families/divider.tsx`: line/numbered/spacer/continue; continue reports `onCompleted` and player consumes it (`packages/player/src/progress.ts`) | none | P5: continue button uses theme primary already; verify sizing |
| Buttons (978-1022) | Items have title + description rich text + button; destination modal supports URL / lesson search / email | `families/buttons.tsx`: label + destination (url/lesson/mailto) only; NO per-item title/description in `buttonsPayloadSchema` (`schemas.ts` lines 457-470); destination editing is form fields in `payload/miscFamilies.tsx`, no lesson-picker modal | major | ADR: extend buttons item payload with optional `title`/`description` html; P3 drawer gets lesson picker; P5 renders title/description above button |
| Code (1024-1065) | Own category; monospace, Copy | `multimedia` variant `code`: header w/ language + copy, line numbers | minor | P4 maps a Code category to `multimedia/code`; syntax highlighting stays out of scope (bundle budget, SPEC 5) |
| Block templates (1067-1093) | Composed patterns inserted as configured block groups | Nothing | missing | Deferred beyond R4 (teardown itself says treat separately); library shows no such category |
| Custom block Beta (1095-1108) | Flexible custom composition | Nothing | missing | Deferred, per teardown "can be deferred" (line 1108) |

Forge-only families with no Rise counterpart (table, audio, callout, scenario, checklist per `packages/blocks/src/registry.ts` and SPEC 3.3 additions) are out of parity scope; they remain in the library under their existing groups.

## 3. Alignment plan

Ordered work packages sized for agent execution. Every package ends green on `pnpm build`, `pnpm test`, `node scripts/contract-check.mjs`, and the module-identity test (`packages/editor/src/moduleIdentity.test.ts`).

### P1. In-place text editing on the canvas (large)

Goal: click text in a block on the canvas and type, Rise-style (Direct Editing, lines 196-208), without forking renderers.

Mechanism, respecting the module-identity contract (one renderer per family, shared by editor and player):

- `packages/blocks/src/context.ts`: `RenderContext` gains an optional `inlineEditing?: InlineEditingPort` where `InlineEditingPort = { renderHtmlField(props: { blockId: string; field: string; html: string; profile: "inline" | "block"; placeholder?: string; className?: string }): ReactElement }` plus `onCommitHtml(blockId, field, html)` semantics owned by the port implementation. `field` is a dot path into the payload (`"heading"`, `"items.2.html"`, `"columns.0.html"`).
- `packages/blocks/src/html.tsx`: new `EditableHtml` component. If `useRenderContext().inlineEditing` is set it delegates to `renderHtmlField`, otherwise it renders the existing `Html`. Renderers opt in per html field by swapping `Html` for `EditableHtml`; the player never sets the port so player output is byte-identical.
- `packages/editor/src/ui/Canvas.tsx`: provide the port. Implementation mounts a chromeless TipTap instance (reuse `richTextConfig.ts` extensions and sanitizer, and the draft/commit/debounce discipline from `RichTextField.tsx`) with a floating bubble toolbar instead of the fixed one. Commit path: sanitize, set by path into a payload draft, run `entry.validatePayload`, then `setBlockPayload` (`packages/editor/src/state/actions.ts`). Invalid HTML never reaches the store (same rule as `PayloadEditor.tsx`).
- Opt-in coverage this package: `families/text.tsx` (all variants), `families/impact.tsx`, `families/list.tsx` items, `families/callout.tsx` body. Item-title plain-text fields (accordion/tabs/flashcards) follow in P3/P5 as a single-line variant of the port.
- Canvas lesson title becomes an inline textarea (`Canvas.tsx` line 158) matching the teardown's lesson title textarea (line 127).

Kept: `RichTextField.tsx` (still used by drawer and quiz forms). Reshaped: `Canvas.tsx`, `html.tsx`, `context.ts`, the four families above. Retired: html fields for those families inside `payload/textFamilies.tsx` (P3 finishes this).

Acceptance:
- Clicking paragraph text in a text block on the canvas places a caret; typing updates the store after debounce/blur; undo (`state/history.ts`) reverts it.
- Player bundle renders those families with zero behavior change (module-identity + render smoke tests pass; `mode: "player"` snapshot unchanged).
- Selecting bold in the bubble toolbar produces sanitized `<strong>` in the payload; disallowed markup from paste is stripped.

### P2. Contextual block rail (medium)

Goal: replace the hover toolbar with a Rise-style per-block rail (Contextual Block Rail, lines 164-179).

Files: `packages/editor/src/ui/BlockEditFrame.tsx` (rewrite), `packages/editor/src/ui/styles.css`, `Canvas.tsx` (insert-between above AND below the hovered block, matching "Plus button before/after" line 345).

- Rail attached to the focused/hovered block edge, vertical icon stack: block-type chip (family label + variant, opens the P4 library filtered for conversion, per Block Selector lines 380-382), Content (opens P3 drawer on content tab), Style (variant card popover replacing the raw `<select>`), Format (envelope: padding, background, text color from `SettingsPanel.tsx` `EnvelopeSettings`), Move up, Move down, Duplicate, Delete. Keep the dnd-kit grip.
- Move up hidden on first block, Move down hidden on last (teardown line 177), not merely disabled.
- Rail never overlaps block content (Context Rail, lines 1217-1219).

Kept: dnd-kit sortable wiring, `state/actions.ts` move/duplicate/delete/variant actions. Reshaped: BlockEditFrame. Retired: the horizontal `fe-block-toolbar` and inline variant `<select>`.

Acceptance: hovering a block shows the rail; first/last blocks omit the corresponding move control; Style popover shows one card per variant and clicking one calls `setBlockVariant` with payload preserved-or-defaulted as today; keyboard: rail buttons reachable by Tab from the block.

### P3. Right drawer as Rise Edit drawer (medium)

Goal: drawer titled per variant, block-specific content first, envelope demoted (Right Drawer, lines 181-194).

Files: `packages/editor/src/ui/SettingsPanel.tsx`, `packages/editor/src/ui/PayloadEditor.tsx`, `packages/editor/src/ui/payload/*.tsx`, `packages/editor/src/ui/styles.css`.

- Header becomes `Edit {variant title}` (e.g. `Edit Paragraph with heading`), with a variant-title map colocated with palette metadata in `packages/blocks/src/registry.ts` (label only, no renderer change).
- Order: content/structure editors first (items, media, answers, destinations, data series, per Content Control lines 353-364), then an `Audio` section where the family supports it, then a collapsed `Block settings` group holding today's `EnvelopeSettings` (also reachable via the rail's Format control).
- Families covered by P1 inline editing drop their duplicated rich-html fields from the drawer (`payload/textFamilies.tsx`); structural fields (add/remove/reorder items, attribution, list type) stay.
- Buttons drawer gains a destination picker with URL / lesson dropdown / email tabs (Buttons authoring, lines 996-1005) using existing course lessons from the store.

Kept: `PayloadEditor.tsx` dispatcher, validation flow, all `payload/*` editors. Reshaped: SettingsPanel chrome and section order, textFamilies. Retired: generic-first envelope layout.

Acceptance: selecting a text block titled drawer reads `Edit Paragraph with heading`; drawer for image starts with media controls; envelope controls are inside a collapsed section; buttons drawer can point a button at `Example Lesson 2` and the canvas button navigates there in preview.

### P4. Quick-add strip + full block library (medium)

Goal: two-tier insertion per Block Creation Model (lines 146-162) and Block Library (lines 276-337).

Files: `packages/editor/src/ui/BlockPalette.tsx` (split into `QuickAddStrip` and `BlockLibrary`), `Canvas.tsx` insert wiring, `packages/blocks/src/registry.ts` palette metadata (category + variant card labels), `styles.css`.

- Plus opens a compact strip anchored at the insert point: Block library, Text, List, Image, Video (multimedia/video), Process, Flashcards, Sorting, Continue (divider/continue button), matching the observed quick-add order (lines 150-160).
- `Block library` opens a side panel (not centered modal): left category rail using teardown taxonomy mapped to Forge families: Text -> text; Statement -> impact a-d; Quote -> impact note/attribution variants; List; Image; Gallery; Multimedia; Interactive -> interactive + interactive-fullscreen; Knowledge check; Chart; Divider; Code -> multimedia/code; plus Forge-only categories (Table, Audio, Callout, Scenario, Checklist). Right side: visual preview cards per variant (CSS thumbnails, no images needed), active category highlight, search retained.
- Insertion inserts family+variant at the recorded index via `insertBlock` (extend to accept variant).

Kept: registry palette metadata, `insertBlock`. Reshaped: BlockPalette. Retired: centered search-only modal.

Acceptance: plus shows the strip with the eight quick-adds; choosing `Continue` inserts divider variant `continue button` at that index; library rail shows Statement and Quote as separate categories both backed by `impact`; search still filters across categories.

### P5. Visual parity pass per family + theme accent (large)

Goal: make the blocks look like the reference, driven by section 2.2 rows marked minor/major and Variants Must Visibly Change Render (lines 1229-1231).

Files: `packages/blocks/src/styles.css`, `packages/blocks/src/blockView.tsx`, targeted renderer tweaks in `packages/blocks/src/families/*.tsx`, `packages/player/src/styles.css`.

- Full-bleed envelope: `BlockView` renders an outer full-width band (background color / theme accent) with an inner centered content column, so statement bands and background colors span the canvas like Rise (Executive Summary line 11 "full-width block bands"). This fixes the `.fb-block` max-width capping backgrounds.
- Impact/Statement: at least one variant becomes a saturated theme-primary band with white text; quote treatment distinct from statement (attribution styling, larger serif feel via theme body font).
- Theme accent audit: continue button, KC submit, checkmarks, tab underline, timeline spine, markers, progress readouts all derive from `--fb-primary`/`--forge-primary` (most already do; close the stragglers: sorting result colors, feedback greens/reds stay semantic).
- Family rows from 2.2: process START/START AGAIN, labeled-graphic bubble prev/next + viewed state, flashcard flip animation + `Click to flip` hint (respect `prefers-reduced-motion`), attachment empty state, gallery/stack control styling, KC proportions, chart default series from theme.
- New checklist doc `docs/reference/visual-parity-checklist.md`: one row per family/variant with the teardown line reference and an eyeball checkbox (see section 5).

Kept: every renderer and its behavior contract. Reshaped: styles.css, BlockView envelope. Retired: nothing.

Acceptance: a block with `backgroundColor` set paints edge to edge in canvas, preview, and export; impact band variant renders theme color full-bleed; all P5 rows in the visual checklist ticked against the teardown notes; module-identity and render smoke stay green.

### P6. Course overview screen (medium)

Goal: Rise course overview parity (Course Overview Screen, lines 40-107; Screen: Course Overview, lines 1112-1138).

Files: new `packages/editor/src/ui/CourseOverview.tsx`, `packages/editor/src/ui/App.tsx` routing, `CourseList.tsx` (opens overview instead of editor), `state/actions.ts` (course description edit exists via `setCourseMeta`; add author when ADR lands), `Outline.tsx` (shared row components or kept as-is for the editor).

- Centered course title + description editables, author display.
- Vertical outline: section headers, lesson rows with type marker (`Lesson`/`Quiz`), title, `Edit Content` link opening `EditorScreen` on that lesson, per-row menu (rename/duplicate/delete/move).
- Inline empty-title input at the bottom: Enter adds a lesson, Shift+Enter adds a section (hint text per teardown line 75); insert controls adjacent to rows.
- Editing-ownership banner is R4-hosted-backend scope (SPEC 4.6 lesson locks), not this package; leave a placeholder slot.

Kept: EditorScreen/Outline unchanged for lesson editing. Reshaped: App routing (CourseList -> CourseOverview -> EditorScreen). Retired: nothing.

Acceptance: opening a course lands on the overview; typing in the empty input and pressing Shift+Enter creates a section; `Edit Content` opens the editor with that lesson selected; back arrow in TopBar returns to overview, not the course list.

### P7. Player chrome parity (small)

Goal: preview/runtime chrome matches the reference learner shell (Learner Preview Screen, lines 210-274).

Files: `packages/player/src/SidebarNav.tsx`, `packages/player/src/Player.tsx`, `packages/player/src/chrome.tsx`, `packages/player/src/styles.css`.

- Sidebar header: course title + `{percent}% COMPLETE` from the existing snapshot (`progress.ts` already computes it; teardown lines 228-235).
- Lesson header: `Lesson {n} of {total}` above the title, author attribution line when course author exists (lines 236-239).
- Checkmarks: replace text glyphs in `SidebarNav.tsx` with themed SVG circle-check; current lesson highlight uses theme primary.
- Block band widths: lesson content column matches the editor canvas width so P5 full-bleed bands behave identically in both.

Kept: progress model, tracking, sequential locks, cover. Reshaped: SidebarNav, lesson header markup. Retired: emoji/text status glyphs.

Acceptance: preview shows `0% COMPLETE` initially and updates after a continue click (mirrors teardown lines 253-259); lesson header shows `Lesson 1 of 2`; checkmark renders in theme color after completing a lesson.

## 4. Non-goals for parity

- Block templates and Custom block (Beta): deferred by the teardown's own recommendation (lines 1085-1108); revisit as a template system after R4.
- Rise-identical quiz lesson chrome: Forge's quiz form editor covers more question types (SPEC 12.7: sequencing, numeric, Likert, pools, timer) and stays.
- SCORM-driver/suspend-data emulation, Articulate telemetry: explicitly exceeded by native xAPI + zero telemetry (SPEC 12.1, 12.13; ADR 0003 keeps `forge-v1` as the only profile).
- Per-author "shared blocks" clone of Rise: superseded by the team-shared block library improvement (SPEC 12.10), later phase.
- Lesson editing locks / TAKE CONTROL banner (teardown lines 99-107): specced (SPEC 4.6 Tier 1) for the hosted-backend phase, not this UX pass.
- Forge-only families (table, audio, callout, scenario, checklist) and required-alt/accessibility checker: kept as deliberate improvements (SPEC 12.6, 12.8), no Rise reference to match.
- Syntax highlighting for code blocks: skipped to hold the player bundle budget (SPEC 5); copy + line numbers already exceed the observed Copy-only behavior.

## 5. Verification

Every package: `pnpm build`, `pnpm test`, `node scripts/contract-check.mjs` (editor declares no payload types, no deep imports), and the module-identity test proving editor canvas and player import the same renderer objects.

- P1: new Vitest coverage: inline port commits sanitized HTML by payload path; renderer without port renders `Html` (snapshot equality with pre-P1 player output); dropped-keystroke regression test around unmount flush.
- P2: DOM test: first/last block rail omits move controls; variant popover fires `setBlockVariant`.
- P3: title map test (every family/variant has an `Edit ...` title); buttons lesson-destination round-trip through `validatePayload`.
- P4: quick-add order matches the teardown list; every registry family+variant is reachable from exactly one library category.
- P5: render smoke per variant (existing pattern) plus the new `docs/reference/visual-parity-checklist.md`: one row per family/variant, columns Teardown ref | Expected | Editor OK | Preview OK, hand-ticked by the author against the reference screenshots; full-bleed band assertion (outer band element width > inner column width) in a jsdom test.
- P6: e2e (`e2e/`): create course -> overview -> Shift+Enter section -> Edit Content -> back.
- P7: progress percent readout updates in a Playwright preview run after clicking Continue; axe pass on sidebar nav.

Schema changes flagged here (text audio, buttons title/description, course author) each require a small ADR + migration in `packages/schema/src/migrations.ts` before their consuming package starts.

# Forge Rules (read before writing any code)

Binding rules for agents working on this repo. Every rule below was verified against the
code on 2026-07-09; most encode a real production incident. Numbers are stable — cite them
in commits and reviews ("per rule A3"). If you believe a rule is wrong, write an ADR first;
do not silently deviate.

Companion docs: `docs/SPEC.md` (the build contract), `docs/ROADMAP.md` (what's next),
`docs/RUNBOOK.md` (how to run everything), `docs/PROMPTS.md` (task templates).

---

## A. Architecture invariants

**A1. `docs/SPEC.md` is the build contract; `@forge/schema` is the ONLY home of
content-model types.**
No `interface`/`type` named `CourseDoc`, `CourseBlock`, `BlockFamily`, `BlockPayload`,
`BlockSettings`, `MediaRef`, `LabelSet`, `QuizLesson`, `BlocksLesson`, or `SectionHeader`
may be declared outside `packages/schema` (`scripts/contract-check.mjs` rule 2).
WHY: the original Codex build grew a parallel untyped model inside the editor and the whole
recovery program (ADR 0003) existed to undo it.

**A2. Every schema change runs the FULL checklist — no partial schema changes.**
Current version: `CURRENT_SCHEMA_VERSION = "1.3.0"` in `packages/schema/src/schemas.ts`.
A change to any schema shape requires ALL of:
1. Bump `CURRENT_SCHEMA_VERSION` (semver; additive = minor).
2. A migration in `packages/schema/src/migrations.ts`, registered in
   `courseDocMigrationRegistry` (chain composes `from` → `to`).
3. A migration test in `packages/schema/src/index.test.ts` (old-shape doc in,
   `CURRENT_SCHEMA_VERSION` doc out).
4. Update `packages/schema/fixtures/kitchen-sink.json` so the fixture exercises the new
   field/shape (the smoke gates render it).
5. Update the exporter's published-object allowlist in `packages/exporter/src/compile.ts`
   — the `published` object is an EXPLICIT allowlist of course keys; a forgotten field
   silently vanishes from every published package (incident: `author` rendered in the
   editor but was missing from packages until V0 fixed the allowlist).
6. Confirm every editor load path migrates: `packages/editor/src/state/courseLifecycle.ts`
   (`enterCourse`) and `packages/editor/src/state/persistence.ts` (`reloadServerCopy`)
   both call `migrateCourseDoc`, never the strict validator alone.
   WHY: incident — strict-validate-without-migrate put unmigrated docs in the store and
   every payload commit failed `validatePayload` with `Unrecognized key(s): 'date'`,
   silently reverting each edit.
7. An ADR if the change alters meaning (rename, semantics), per the ADR 0004 precedent.

**A3. Single renderer: block visuals live ONLY in `@forge/blocks`.**
One `Renderer` per family in the registry (`packages/blocks/src/registry.ts`,
`packages/blocks/src/index.ts`); editor canvas and player mount the IDENTICAL component
inside the `BlockView` band+column envelope. `scripts/contract-check.mjs` rule 4 bans any
`<Family>Renderer` declaration in editor/player source; `packages/editor/src/moduleIdentity.test.ts`
proves module identity. Editor affordances (rail, inline editing) WRAP the shared renderer
via `RenderContext` (`packages/blocks/src/context.ts`) — `mode: "edit" | "player"` toggles
behavior hooks, never visuals. The editor supplies `inlineEditing` (an `InlineEditingPort`);
the player never does, keeping TipTap out of the runtime bundle.
WHY: this is the Rise WYSIWYG property — the entire product premise.

**A4. Band layout contract (header comment of `packages/blocks/src/styles.css` — read it).**
Every block is a full-bleed BAND (`.fb-block`) painting `settings.backgroundColor` edge to
edge, with a centered content COLUMN (`.fb-block-inner`). Do not regress:
- The band chain must be `width: 100%` with NO horizontal padding, margin, border, or
  max-width anywhere from `.fb-block` up to the host scroll container (`.fe-canvas`
  editor, `.fp-main` player). Hosts must not wrap blocks in a max-width column.
- Horizontal insets and centering live ONLY on `.fb-block-inner`
  (column `--fb-column` 46rem, wide `--fb-wide` 64rem, full = unbounded, zero padding).
- Images never hard-crop; the banner image variant is the single sanctioned crop.
- Anything wider than the column scrolls via its own `overflow-x: auto` wrapper.
WHY: full-bleed statement bands are core Rise parity; a "floating paper card" canvas was
explicitly rejected (docs/design-system/decisions.md).

**A5. Published player packages are SELF-CONTAINED.**
`packages/player/src` must contain ZERO `--an-` token references and ZERO `@forge/ui`
imports (verified: none exist today — keep it that way). Where player chrome matches Anvil,
structural values are COPIED with `/* an-... */` provenance comments (the D4 convention,
docs/design-system/decisions.md "D4 player chrome adoption (value copy, not import)").
Course theming inside packages uses `--forge-*` / `--fb-*` custom properties only.
WHY: the zip must run standalone inside Stream Curatr with no editor CSS present; an
`--an-` var in the package resolves to nothing and silently unstyles learners.

**A6. LOCKED: player entrance animation values.**
`packages/player/src/entrance.ts` + the matching CSS: transition
`opacity 1s ease-out, transform 1s ease-out`; `ENTRANCE_BASE_DELAY_S = 0.12`;
`ENTRANCE_STAGGER_S = 0.15`; `ENTRANCE_FALLBACK_MS = 1000`;
`ENTRANCE_ROOT_MARGIN = "2% 0px"`, threshold 0, unobserve on first fire; offsets
fade→translateY(25px), slide→translateX(-50px), zoom→scale(0.95). These were measured from
the real Rise runtime (`.scroll-animation`, `QY`/`KY` in Rise's bundle). Do not retune.
Entrance lives in the player-only `PlayerBlock.tsx` wrapper, NEVER in shared `BlockView`
(the canvas must stay static or A3 breaks). `prefers-reduced-motion` disables everything.

**A7. Gating semantics are load-bearing.**
`visibleBlocks` (`packages/player/src/lessonReveal.ts`) returns the prefix up to and
including the first unconsumed `divider / continue button`; gated blocks are ABSENT from
the DOM, not hidden. `packages/player/src/progress.ts` decides scroll- vs
interaction-consumption per family — e.g. a timeline with `detailsAlwaysVisible: true` (or
all events `startExpanded`) consumes by scroll. Changes here require
`packages/player/src/gating.test.ts` updates and a green `node e2e/player/gating-run.mjs`.
WHY: gating feeds lesson percent, sequential locking, and xAPI completion — a silent
change strands learners at 99%.

**A8. xAPI surface is frozen to the `forge-v1` profile.**
IRI base `https://xapi.supercell.com` (`packages/schema/src/iri.ts`); the course IRI is the
permanent LRS key — confirm the base before the first production publish and never change
it after. Statement shapes are pinned by `e2e/xapi/golden-statements.json` via
`node e2e/xapi/golden-run.mjs` (22 statements, 8-way tracking/reporting matrix). A
`rise-compat` profile was cut by ADR 0003. Player bundle budget: < 300 KB gz (SPEC §5) —
no heavy deps in `@forge/player`/`@forge/blocks` (no Recharts, no syntax highlighters).

---

## B. Design system (Anvil, `@forge/ui`)

**B1. `anvil.css` and `tokens.ts` are GENERATED — never hand-edit.**
Source of truth: `packages/ui/src/tokens/anvil.tokens.json` (DTCG) + `src/tokens/build.ts`.
Build is two-pass: `tsc` compiles build.ts → `node dist/tokens/build.js` emits
`src/anvil.css` + `src/tokens.ts` → next `tsc` compiles tokens.ts (the package `build`
script chains this). BOTH generated files are committed. Edit the JSON, run
`pnpm -F @forge/ui build`, commit all three.

**B2. `@forge/ui` has zero dependencies beyond `react`.**
It is extraction-ready for future T&S apps (roadmap D7). Mantine was evaluated and
explicitly DECLINED (docs/design-system/decisions.md; motion built as ~150-line
Anvil-native primitives instead). Do not add UI libraries, portal helpers, or css-in-js.

**B3. `components.css` consumes tokens, not literals.**
Transitions use `--an-duration-*` / `--an-ease-*`; colors/space/radius/shadow come from
semantic `--an-*` tiers, never color primitives directly. Committed exceptions (do not
multiply): continuous keyframe loops (`an-spin 600ms`, `an-shimmer 1400ms`) and the
reduced-motion `1ms` animation kill.
WHY: dark mode and reduced-motion work by remapping the semantic tier only; a literal
escapes both.

**B4. Type roles emit LONGHANDS, never the `font:` shorthand.**
`build.ts` writes font-family/size/weight/line-height/letter-spacing individually.
WHY: field incident (commit ed06b1f) — the shorthand reset line-height/spacing set
elsewhere and broke chrome typography.

**B5. Motion goes through the Presence/Collapse primitives**
(`packages/ui/src/components/Presence.tsx`, `Collapse.tsx`). Exit unmount fires on
`transitionend`/`animationend` with `event.target === node` only; `transitioncancel` is
NOT an exit signal — treating it as one instantly unmounted reopened nodes (the quick-add
spam-click incident, commit d9c63d5). Exit styling is token-driven CSS on
`[data-state="closed"]`. Do not build on Chrome-only CSS (`interpolate-size`,
`::details-content`).

**B6. Dark mode is a `[data-theme="dark"]` SEMANTIC remap on the `.anvil` scope;
primitives never change at runtime.** The editor canvas paper stays author-themed in dark
mode by design (`.fe-canvas-lesson` paints `--forge-bg`; blocks read only
`--forge-*`/`--fb-*`) — do not "fix" the canvas to invert.

**B7. CSS landmines — each of these caused a real incident:**
- NEVER write the two-character sequence `*/` inside a CSS comment BODY (e.g. prose like
  "--forge-*/--fb-*"). The comment terminates early and CSS error recovery silently drops
  the NEXT rule. Incident: the `.anvil` font rule was swallowed and the whole editor
  rendered in Times (commit eb19377). Enforced by contract-check rule 6.
- NEVER put `inherit` inside a `font-family` list — it invalidates the declaration
  (commit 3375dd6).
- NEVER use `local()` + `size-adjust` metric-override fallback faces — Chrome falls back
  to Times (commit 0c4f0b3). The fallback stack in `packages/ui/src/fonts.css` is plain.
- Browser fetch APIs passed as VALUES must be bound:
  `fetch.bind(globalThis)` — an unbound `window.fetch` throws `Illegal invocation`
  (commit 04cf044, hit in real LMS launches).

---

## C. TypeScript / build

**C1. Compiler settings are non-negotiable** (`tsconfig.base.json`): `strict`,
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `module: NodeNext`. NodeNext
means relative imports carry `.js` suffixes in source. Do not weaken flags per-package.

**C2. Optional booleans follow present-means-true:** schema optionals like
`startExpanded`/`detailsAlwaysVisible` are `z.boolean().optional()` — write `true` or omit
the key entirely; never persist `false`. WHY: `exactOptionalPropertyTypes` + the
exporter's omit-undefined allowlist keep published JSON deterministic.

**C3. Deep cross-package imports are banned** — public API via each package's `index.ts`
only; `@forge/<pkg>/styles.css` is the sole exemption (contract-check rule 3).

**C4. Committed build artifacts MUST be refreshed when their sources change:**
- `packages/editor/public/player-runtime/player.js|css` — rebuild with
  `pnpm -F @forge/player build:runtime` after ANY change to `@forge/blocks` or
  `@forge/player` (including CSS). The editor publish flow fetches these committed files;
  forget the rebuild and published packages ship STALE visuals while the canvas looks fine.
- `packages/ui/src/anvil.css` + `src/tokens.ts` — via `pnpm -F @forge/ui build` (B1).
- `anvil-styleguide.html` (repo root, committed) — via `node scripts/make-styleguide.mjs`
  after design-system changes.
- (`forge-review.html` is gitignored; regenerate ad hoc with `scripts/make-standalone.mjs`.)

**C5. New dependencies need explicit approval from Simon and pinned versions.**
Precedent: TipTap extensions are pinned at `2.27.2` (the official font-size extension is
v3-only; custom mini-extensions were written instead). No dependency may enter
`@forge/ui` (B2), and nothing heavy enters the player (A8).

---

## D. Verification gates

**D1. Before ANY commit, run the gates relevant to the change; before a schema, exporter,
player, or blocks change lands, run them ALL.** All commands from the repo root:

| Gate | Command | Proves |
| --- | --- | --- |
| Contract check | `node scripts/contract-check.mjs` | rules A1/A3/C3, no condemned files, no localStorage course data, CSS comment integrity |
| Render smoke | `node e2e/smoke/render-smoke.mjs` | every registry variant (59 at v1.3.0) renders through shared BlockView; kitchen-sink validates |
| Fonts smoke | `node e2e/smoke/fonts-smoke.mjs` | course font catalog + publish css helpers (needs player dist) |
| Rich text smoke | `node e2e/smoke/richtext-smoke.mjs` | every toolbar-producible HTML shape passes sanitizer + zod commit gates |
| Exporter | `node e2e/exporter/build-run.mjs` | deterministic double build, valid zip, tincan.xml interaction activities |
| Gating | `node e2e/player/gating-run.mjs` | continue-divider progressive reveal semantics |
| xAPI golden | `node e2e/xapi/golden-run.mjs` | 22 golden statements + 8-way completion matrix |
| Builds | `pnpm build` (turbo) or `pnpm -r build` | all 7 packages compile strict |
| Tests | `pnpm test` (turbo) or `pnpm -r test` | vitest incl. migrations, module identity, gating |

`pnpm verify` = contract-check + build/lint/test + render-smoke (root `package.json`).
Change-type minimums: blocks/player visuals → contract-check, render-smoke, gating,
build:runtime refresh (C4); schema → FULL set + A2 checklist; exporter/xapi → exporter +
golden + render-smoke; editor chrome → contract-check, render-smoke, richtext-smoke;
design system → contract-check, render-smoke + styleguide regen. E2e gates are plain Node
scripts against built dist — they need `pnpm build` first (there is no Playwright here).

**D2. Schema changes additionally require a runtime spot-check:** load a pre-change course
JSON in the editor (or a unit test through `migrateCourseDoc`) and confirm edit + save +
publish round-trips.

---

## E. Content and sanitization

**E1. The rich-text HTML allowlist lives in `packages/schema/src/sanitizer.ts`** —
`allowedTags`, per-tag attribute lists, and `isSafeStyleAttribute` per-property value
regexes (only: `color`, `background-color`, `font-size` px, `font-family`, `text-align`,
`line-height`; rejects `url(`, backslash, `expression`, `@`). Any toolbar/editor feature
must serialize to output this sanitizer accepts — a rejected fragment silently reverts the
field, which authors read as "the toolbar does nothing" (see
`e2e/smoke/richtext-smoke.mjs` header).

**E2. Font stacks are QUOTE-FREE** (`packages/player/src/fonts.ts`). Quoted family names
serialize as `&quot;` through the editor pipeline and fail the sanitizer's font-family
charset — incident documented in that file's header. Every curated stack's FIRST entry is
the css family name the `@font-face` rules declare.

**E3. localStorage is banned for course data** (contract-check rule 5 scans the editor for
localStorage keys/args containing "course"; ADR 0003). The IndexedDB write-ahead journal
is the only local course persistence. UI preferences are fine when the key has no "course"
in it (existing: `forge-ui-theme`, `forge-outline-collapsed`).

---

## F. Process

**F1. Evidence before fix.** Reproduce, capture the actual page/CSS/network bytes, and
identify the root cause BEFORE changing code. WHY: the Times-font saga took four commits
(3375dd6, 0c4f0b3, 8b56817, eb19377) of plausible-but-wrong fixes until a CSS byte dump
found a comment body containing `*/`. Multiple plausible fixes are a smell, not progress.

**F2. Never resurrect condemned files.** `packages/editor/src/domain/courseModel.ts` (and
its test) were deleted by ADR 0003; contract-check rule 1 fails if they reappear.

**F3. Prefer small verified diffs.** One concern per commit; every commit message can cite
its passing gates (this repo's convention — see `git log`).

**F4. Decisions get written down.** Design-system decisions go in
`docs/design-system/decisions.md` (the living log); architectural decisions get a new ADR
in `docs/adr/` (one page: Date, Status, Context, Decision, Consequences) plus an
`0000-index.md` entry. Stack or contract deviations from SPEC require an ADR in the same
change.

**F5. Executed plan docs are deleted, not archived** (ADR 0005). Historical plans live in
git history; code comments citing e.g. `docs/PLAYER-UX-PLAN.md` refer to history. Do not
recreate plan files for new work unless the work spans multiple sessions — and delete them
when executed.

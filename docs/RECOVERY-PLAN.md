# Forge Recovery Plan

Date: 2026-07-07
Author: Claude (review of Codex build against docs/SPEC.md)
Status: Proposed

## 1. Diagnosis

The build diverged from the spec in one fundamental way that caused every downstream problem: **the editor did not build on `@forge/schema`**. It defined a parallel untyped model (`packages/editor/src/domain/courseModel.ts`) and absorbed the scope of four other packages into a single 3,748-line `App.tsx`.

Current package reality:

| Package | Spec role | Actual state | Verdict |
|---|---|---|---|
| `@forge/schema` | Content model, single source of truth | Complete: Zod, migrations, JSON Schema, sanitizer, IRIs, Yjs round-trip | **Keep as-is** |
| `services/api` | FastAPI: courses, lessons, sessions, media | Phase 1 skeleton complete, tested | **Keep, extend** |
| `@forge/blocks` | Block registry + shared renderers (the WYSIWYG core) | 2-line stub | **Build (highest priority)** |
| `@forge/player` | Self-contained runtime | 136 lines of preview types only | **Build** |
| `@forge/xapi` | Launch, statements, State API, queue | 2-line stub; logic lives in editor's publishModel.ts | **Build by extraction** |
| `@forge/exporter` | tincan.xml, deterministic zip | 2-line stub; "publish" is a JSON download | **Build** |
| `@forge/ui` | Shared primitives | 2-line stub | Build incrementally |
| `@forge/editor` | Authoring shell | Monolith on wrong model, localStorage persistence, contentEditable | **Refactor to shell** |

Root causes to fix in process, not just code:

- Contract enforcement was absent: nothing failed CI when the editor ignored `@forge/schema`.
- Agent A2 (editor) absorbed A3/A4/A5 scope as visual facsimiles.
- STATUS.md reported gate completion that didn't reflect the working software.
- Stack deviations (no TipTap, no dnd-kit, no Zustand, no Tailwind, contentEditable) shipped without ADRs, violating SPEC §2.

## 2. Guiding decisions

1. **`CourseDoc` from `@forge/schema` is the only content model.** The editor's `domain/courseModel.ts` is deleted outright (decision: Simon, 2026-07-07). No migration of legacy localStorage courses; they are test data.
2. **One renderer per block family, in `@forge/blocks`, used by both editor canvas and player.** This is the Rise WYSIWYG property. No package may render a block any other way. Editor affordances (toolbars, drag handles, inline editing) wrap the shared renderer.
3. **Editor preview mounts the real `@forge/player`** against draft data. The in-editor preview facsimile is deleted.
4. **Persistence goes through `services/api`** (per-lesson PUT with revision numbers). localStorage is demoted to the write-ahead journal role (SPEC §4.5.2).
5. Stack per SPEC §2 unless an ADR says otherwise. File ADR 0002 now: React 19 accepted (supersedes "React 18"); everything else converges to spec — TipTap 2, dnd-kit, Zustand + Immer, TanStack Query, Tailwind + CSS variables.

## 3. Salvage map

Work already done that ports rather than being rewritten:

- Block visual treatments and variant behaviors in `App.tsx` and the audit-pass fixes → move into `@forge/blocks` renderers, retyped against schema payloads.
- `publishModel.ts` statement construction, IRI usage, interaction definitions, launch/actor handling → extract into `@forge/xapi` (statement builder, launch parser) and `@forge/exporter` (course-data compilation). Delete the file when empty.
- `publishModel.ts` readiness checks → seed of the accessibility/validation checker (SPEC §4.3, §7.2).
- Player preview types/progress helpers (136 lines) → absorbed into the real player's progress module.

## 4. Phases

### R0 — Freeze and re-contract (1–2 days)

- Stop all feature work in `App.tsx`.
- File ADR 0002 (stack convergence, React 19) and ADR 0003 (schema canonicalization + legacy course migration).
- Add CI contract checks: `@forge/editor` may not declare block payload types; forbid deep imports; player bundle-size budget job (SPEC §5: <300 KB gz).
- Update `coordination/STATUS.md` to reflect reality (Phase 2 restarted under this plan).

### R1 — Re-plumb foundations (local MVP backbone)

Goal: same visible functionality as today, but on the correct architecture.

1. `@forge/blocks`: implement `BlockRegistryEntry` per CONTRACTS.md for the full family list. Each entry: typed payload from schema, `createDefaultPayload`, `validatePayload`, shared `Renderer` (view), `EditorShell` wrapper (edit affordances). Port visuals from the monolith.
2. `@forge/player`: real runtime SPA — cover page, lesson nav sidebar, block rendering via registry, progress model (block consumption: scroll, interaction, continue-gate, KC answer), free/sequential navigation. Vite build to self-contained bundle.
3. `@forge/editor`: reduce `App.tsx` to the three-region shell (outline / canvas / settings panel) over a Zustand store holding a `CourseDoc`. Canvas renders registry editor components. Preview button mounts the actual player against draft state.
4. Persistence: TanStack Query client for `services/api` (course CRUD, per-lesson PUT with revision numbers, session resume). Legacy localStorage courses are discarded. Journal in IndexedDB per SPEC §4.5.2.

Gate R1: every block family renders identically (same component) in editor canvas and player preview; course survives editor restart via the API; `pnpm build && pnpm test` green.

### R2 — Rise-parity authoring UX

1. TipTap 2 everywhere text is edited: sanitized mark/node subset from `@forge/schema` sanitizer policy, paste cleaning, markdown shortcuts, contextual bubble toolbar.
2. dnd-kit: block reorder on canvas, outline lesson/section reorder, drag from palette; insert-between hover affordance and searchable block palette with thumbnails.
3. Settings panel bound to schema `BlockSettings` (padding scale, background, text color mode, variant switch within family) — settings must visibly change canvas and player, enforced by tests per family.
4. Media pipeline: media registry (`MediaRef`), upload via API signed-URL shape (local disk backend for MVP), tabbed media picker (library / upload / URL), required alt text at insert, image zoom.
5. Theme editor (color, typefaces, contrast warnings) and label set editor.
6. Undo/redo command stack over Immer patches (≥100 steps, survives lesson switch).

Gate R2: side-by-side with Rise, an author can build the reference course's lesson types without touching JSON; interactions (accordion/tabs/flashcards/process) are learner-operable in the player.

### R3 — Tracking and publishing (xAPI-native, the point of the project)

1. `@forge/xapi`: launch param parsing (untracked preview mode + strictLaunch), statement builder per SPEC §6.3, batched queue with localStorage persistence, retry/backoff, sendBeacon flush, State API resume (§6.4), completion engine (§6.5 reporting matrix).
2. Player quiz engine: attempts, scoring, passing score, retry limits, reveal policy, shuffle/random order, pools, timer; results screen.
3. `@forge/exporter`: `course-data.json` compilation (notes stripped, package-relative media), `tincan.xml` via a real XML serializer, package layout per SPEC §7. Server-side deterministic zip in a FastAPI publish job (Python `zipfile`).
4. e2e: golden package test, resume test, reporting matrix test (SPEC §10.1–10.3).
5. **Unblock REQUESTS.md #1** — supply `example-course-xapi-97C24s-3.zip`, decoded `course.json`, and reference `tincan.xml` into `docs/reference/`. Golden parity work cannot start without them.

Gate R3: published zip launches from a local LRS harness (Learning Locker via the existing MCP/test instance is an option), scripted playthrough matches golden statement log, resume works across relaunch.

### R4 — Hosted webapp

1. `services/api`: swap in-memory repo for Postgres (SQLAlchemy + Alembic), GCS media backend, publish worker, versions/snapshots, comments, shared blocks.
2. SSE presence + lesson locks + request-control (SPEC §4.6 Tier 1), with the polling fallback behind `PresenceTransport`.
3. Deploy: Static Sites workflow for editor (internal tier, `source-dir: dist`), Cloud Run for API behind Okta gateway; execute the ADR 0001 SSE/websocket spike against the real gateway and record evidence.
4. Manual gate: upload a package to Stream Curatr, verify statements in Learning Locker (SPEC §10.4).

## 5. Process guardrails for Codex

- Rewrite the agent prompts so the **editor agent's canvas work is blocked on the blocks-registry deliverable** — A2 may not render a block family that A3/blocks hasn't shipped. No package may stub another's scope.
- Every gate claim in STATUS.md must reference a passing command (`pnpm test --filter ...`) or a Playwright run; "complete" without a runnable proof is not complete.
- Definition of done per block family: registry entry + typed payload + shared renderer used in both surfaces + settings visibly functional + a Vitest snapshot for each variant.
- Any stack or contract deviation requires an ADR in the same PR.

## 6. Open items and resolved decisions

Resolved 2026-07-07:

- Legacy editor model: deleted, no migration.
- IRI namespace: not a build blocker. `https://xapi.supercell.com/...` is a config default in `@forge/xapi` / `@forge/exporter`; confirm the base once before the first production publish (the course IRI is the course's permanent key in the LRS).
- Stream Curatr `registration`: not a build blocker. The specced fallback (player generates and persists a registration when the launch omits one) covers both outcomes; verified by observation at the R4 manual gate.
- `rise-compat` statement profile: cut from scope unless a specific Learning Locker dashboard is named that must keep working. Only `forge-v1` ships.

- Reference artifacts (REQUESTS.md #1): supplied and committed 2026-07-07. `docs/reference/example-course-xapi.zip`, `tincan.xml`, `course.json` (decoded from `scormcontent/runtime-data.js`), `tc-config.js`. Golden parity work in R3 is unblocked.

Still open: nothing. All decisions needed to execute R0-R3 are made.

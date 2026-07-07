# Forge Build Status

Status claims cite runnable proofs. A claim without a proof is not a claim.

## Current Phase

Recovery R1 complete (docs/RECOVERY-PLAN.md). The editor, blocks registry, and player now share one render path over `@forge/schema`.

## Done

### Pre-recovery (Phase 1)

- `packages/schema`: content model, validators, migrations, IRI helpers, sanitizer, JSON Schema emission, kitchen-sink fixture, Yjs round-trip test. Proof: `pnpm --filter @forge/schema test`.
- `services/api`: FastAPI skeleton (identity headers, course CRUD, per-lesson PUT with revisions, sessions, upload signing). Proof: `pnpm exec pytest services/api` (or `pytest` from `services/api`).
- ADR 0001 (gateway SSE/websocket spike defaults).

### Recovery R0 (2026-07-07)

- ADR 0002 (stack convergence, React 19 accepted, R1 bridges marked `// R2:`), ADR 0003 (schema canonicalization, legacy model deleted without migration, rise-compat cut).
- Contract enforcement: `scripts/contract-check.mjs` (no content types outside schema, no deep imports, no local block renderers in editor/player, no localStorage course persistence, condemned files gone). Proof: `pnpm contract-check`.
- Reference artifacts supplied and committed to `docs/reference/` (Rise export zip, tincan.xml, decoded course.json). REQUESTS.md #1 closed.

### Recovery R1 (2026-07-07)

- `@forge/blocks`: full registry, 18 families / 58 variants, single Renderer per family used by BOTH editor canvas and player, typed payloads from schema, schema-validated default payloads, shared styles. Proof: `pnpm --filter @forge/blocks build` and `pnpm smoke` (58 registry variants + 58 kitchen-sink blocks render through shared BlockView).
- `@forge/player`: real runtime. Cover page, themed via course tokens, sidebar nav with sequential locking, block consumption model (scroll + interaction gates), progress snapshots, quiz engine for all 7 question types, prev/next/continue, a11y basics. Proof: `pnpm --filter @forge/player build`; SSR smoke renders the kitchen-sink course cover.
- `@forge/editor`: rebuilt as a shell over CourseDoc. Monolith and parallel model archived to `docs/reference/legacy-editor/` (no git history exists, nothing deleted). Course list + three-region editor (outline / canvas via shared BlockView in mode="edit" / settings panel with validated payload editing), block palette from registry metadata, variant switching, undo/redo, preview overlay mounting the real `@forge/player` Player at device widths. Persistence through `services/api` (per-lesson PUT with revision numbers, 409 conflict banner, offline queueing) with an IndexedDB write-ahead journal and restore-on-load. Proof: `pnpm --filter @forge/editor build`, `pnpm contract-check`.
- All 7 workspace packages compile clean under strict TS. Proof: `pnpm build`.

## Environment note

This recovery pass ran in a sandbox without npm registry access and with darwin-only native binaries (turbo/vite/vitest could not execute; tsc could). Verification used direct tsc builds, the contract check, and Node SSR smoke tests. On a networked Mac, run `pnpm install` once (solidifies the react links added to blocks/player package.json), then `pnpm verify`.

### Recovery R2, dependency-free half (2026-07-07)

- Per-family payload editors for all 18 families (purpose-built forms replacing the generic R1 form: media pickers with required alt, validated embed URLs, table column/cell integrity per schema superRefine, KC answer editors with MC radio semantics, scenario scene/choice editor with branch selects). Proof: `pnpm --filter @forge/editor build`, `pnpm contract-check`.
- Full quiz lesson editor: settings form (passing score, retries incl. unlimited, reveal policy, shuffles, pool size, time limit) and questions CRUD for all 7 types with schema-validated commits. Proof: same.
- Course tooling: theme editor with live WCAG AA contrast checking, label set editor with JSON export/import, tabbed media picker (library / upload with object-URL bridge / URL) behind a shared accessible dialog. Proof: same.
- Review build refreshed: `node scripts/make-standalone.mjs` regenerates `forge-review.html` (81 modules, 9 stylesheets).

### Recovery R2, dependency half (2026-07-07, after pnpm install)

- TipTap 2 rich text everywhere sanitized HTML fragments are edited (payload editors and quiz editors): sanitizer-subset StarterKit config (h2-h4, no hr), toolbar with active states, markdown input rules, Word/GDocs paste style stripping, validate-before-commit against the schema sanitizer. Raw contentEditable bridge eliminated. Link/underline/sup/sub extensions staged in package.json for the next `pnpm install` (// R2.6 marker).
- dnd-kit drag reorder: canvas blocks and outline lessons, grip-only listeners (6px activation so clicks stay clicks), keyboard pick-up/move/drop, DragOverlay cards, up/down buttons kept for a11y redundancy.
- State layer per ADR 0002: store internals swapped to Zustand (public API preserved), history on Immer structural sharing (patch-based journaling queued for R3), TanStack Query on the read path (course list with retry/refetch states) with the bespoke autosave/journal write path intact.
- Proof: `pnpm --filter @forge/editor build` clean, `pnpm contract-check`, `pnpm smoke`, review build regenerated (86 modules, 11 stylesheets).

### Recovery R3 (2026-07-07)

- `@forge/xapi`: launch parser (tracked/untracked/strict, registration generation + State persistence per SPEC 13.2), StatementBuilder for the full SPEC 6.3 verb table with cmi.interaction definitions mirroring the reference tincan.xml response formats, batched transport queue (localStorage persistence, backoff, keepalive flush, at-least-once), StateClient (debounced writes, versioned envelope), pure completion engine (2 tracking x 4 reporting modes, at-most-once outcome guarantees), TrackingPort + nullTracker. Proof: `node e2e/xapi/golden-run.mjs` (22 golden statements, 8/8 matrix) and `pnpm --filter @forge/xapi test` on a networked machine.
- `@forge/exporter`: published course-data compile with validation warnings, tincan.xml via escaping XmlWriter matching reference structural patterns, deterministic pure-TS STORE zip (sorted entries, fixed timestamp, CRC32), SPEC 7 package layout with launch index.html. Proof: `node e2e/exporter/build-run.mjs` (byte-identical double build, unzip -t clean, 11 interaction activities from the kitchen sink).
- Player tracking + resume: TrackingPort wiring at every SPEC 6.3 moment, State-backed resume (bitset consumption per lesson, bookmark, quiz attempt continuation), untracked preview banner, standalone runtime entry + vite bundle config (`pnpm --filter @forge/player build:runtime` on the Mac).
- Editor Publish: settings dialog per SPEC 6.5/7 (tracking, reporting, exit link, hide cover, strict launch; forge-v1 only), in-browser package build + zip download, warning report panel. Server-side publish worker (Python, deterministic zip in the API) remains the R4 deployment path; the in-browser build is the local-MVP bridge.
- Git: repository initialized, baseline + R3 commits on `main`, remote `https://github.com/simon-smithSC/forge_builder.git` (push requires owner credentials).

### Rise parity waves (2026-07-07)

- Stream Curatr manual gate PASSED: published package launched from Curatr, tracked mode confirmed, statements delivered to Learning Locker (after the fetch-binding fix). SPEC 13.2 answered: Curatr passes registration and overrides activity_id with its resource IRI.
- Authoring parity (teardown-driven): schema 1.1.0 (text audio, button title/description, author), full-bleed band envelope, per-family visual rebuild (process/timeline/labeled graphic/statement bands/sorting/flashcards), in-place TipTap editing via inlineEditing port, contextual block rail, variant-titled drawer. Proof: `pnpm contract-check`, `pnpm smoke`, docs/visual-parity-checklist.md.
- Learner parity (U1-U5): Rise-spec entrance animations, continue gating with progressive reveal, hero cover + lesson header images + font stacks, sidebar % COMPLETE chrome + mobile drawer, settings honoring. Proof: `node e2e/player/gating-run.mjs`.

## In Progress

- None. Next: R4 (Postgres/GCS persistence, SSE presence + lesson locks, Static Sites + Cloud Run deploy, server-side publish worker), U6 font pipeline, remaining parity packages P4/P6/P7.

## Blocked

- Real Okta/Cloud Run gateway spike still requires deployed infrastructure (ADR 0001 fallback defaults in force).

## Next Gate: R2 (Rise-parity authoring UX)

Per docs/RECOVERY-PLAN.md: dependency installation (TipTap, dnd-kit, Zustand+Immer, TanStack Query, Tailwind per ADR 0002), rich text replacing the R1 payload-form bridge, drag reorder, per-family payload editors, quiz lesson editor, media picker + signed-URL uploads wired to the API, theme/label editors, learner-operability polish. Then R3: `@forge/xapi` + `@forge/exporter` (salvage donor preserved at `docs/reference/legacy-editor/publishModel.ts.txt`), golden package tests against `docs/reference/`.

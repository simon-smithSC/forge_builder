# Forge Roadmap

Updated 2026-07-09 (Codex handoff, ADR 0005). Done items are proven by the gates cited in
`git log`; next items are ordered. Rules in `docs/CODEX-RULES.md` apply to all of them.

## Done

- **2026-07-04** — Pre-recovery Phase 1: `@forge/schema` content model + `services/api`
  FastAPI skeleton; block-functionality registry pass on the old editor (superseded).
- **2026-07-07** — Recovery R0–R3: contract enforcement (ADR 0002/0003,
  `scripts/contract-check.mjs`); `@forge/blocks` registry (18 families / 58 variants,
  single shared renderer); `@forge/player` runtime; editor rebuilt on `CourseDoc`;
  per-family payload editors + quiz editor + TipTap + dnd-kit + Zustand; `@forge/xapi` +
  `@forge/exporter` with golden-statement and deterministic-zip proofs; in-browser publish.
- **2026-07-07** — xAPI pipeline proven end to end: package uploaded to Stream Curatr,
  tracked launch confirmed, statements verified in Learning Locker (fetch-binding fix).
- **2026-07-07/08** — Rise parity P1–P7: schema 1.1.0 (ADR 0004), full-bleed band
  envelope, in-place TipTap editing, contextual rail, quick-add strip + block library,
  course overview screen, player chrome residue, true full-bleed layout fixes.
- **2026-07-08** — Player UX U1–U5: Rise-measured entrance animation (values LOCKED,
  rule A6), continue gating with progressive reveal, themed cover/sidebar chrome, mobile
  drawer, settings honoring.
- **2026-07-08** — Anvil design system D1–D6: DTCG token pipeline, 24 zero-dep primitives,
  editor + player chrome adoption, typography/icons/depth, dark mode, three beautification
  waves (V5A/B/C).
- **2026-07-08** — Rich text selection toolbar (Tiptap 2.27.2 BubbleMenu: fonts, color,
  size, align, lists, links); schema v1.2.0 (course cover + descriptionHtml + lesson
  header, sanitizer style allowlist).
- **2026-07-08** — Course font catalog + embedded WOFF2 publish pipeline (U6/V4): 9 OFL
  faces, `fetch-course-fonts.mjs`, ThemeEditor pickers.
- **2026-07-08** — Anvil motion primitives (Presence/Collapse, Mantine declined) + editor
  chrome adoption; Presence transitioncancel incident fixed.
- **2026-07-09** — Schema v1.3.0 block features: screen-bar divider, process card slide,
  timeline label rename + `startExpanded` + `detailsAlwaysVisible` gating, accent Tier 1
  structure markers; editor-load migration hardening (commit 8e1a00c).

## Next (ordered)

### 1. R4 platform wave (the big one)

Turn the local MVP into the hosted product. Current state, verified in code:
`services/api` is an in-memory FastAPI skeleton (`repository.py` dict store, fake upload
signer, header-based auth stub — see `services/api/README.md` "Current Limitations");
publish is in-browser only (`packages/editor/src/ui/publish/publishAction.ts` fetches the
committed player runtime and zips client-side). Scope:

- **Postgres + GCS persistence**: SQLAlchemy models + Alembic migrations behind the
  existing repository protocol; GCS signed uploads replacing the fake signer; media
  dedupe. Deps are already declared in `services/api/pyproject.toml`.
- **Multi-author**: `GET /courses/{id}/events` SSE presence, lesson locks +
  request-control ("TAKE CONTROL" banner slot exists in the editor), 15s-polling fallback
  behind the `PresenceTransport` abstraction (ADR 0001 — run the deployed gateway spike).
- **Server-side publish worker**: Python deterministic zip mirroring
  `@forge/exporter` output; publish jobs + package history endpoints
  (coordination/CONTRACTS.md REST surface already reserves them).
- **Deployment**: editor SPA on Supercell Static Sites
  (constraints: `docs/reference/static-sites.md`), API on Cloud Run behind the Okta
  gateway; verify forwarded-header auth server-side.
- **Gate**: after deploy, re-run the full Stream Curatr upload → Learning Locker
  statement verification before calling it done.

### 2. D7 Anvil extraction packaging

Package `@forge/ui` for standalone consumption by future T&S apps (it is already zero-dep,
rule B2). Versioning, changelog, consumption docs, npm-publishable layout.

### 3. Smaller queue (roughly in order)

- Remaining Dialog → Presence motion migrations: ThemeEditor, LabelSetEditor, publish
  dialog (MediaPicker + LessonHeaderDialog are done).
- Fontsource version pinning in `packages/ui/scripts/fetch-fonts.mjs` and
  `packages/player/scripts/fetch-course-fonts.mjs` (currently `@latest` on jsDelivr).
- Italic font weights for the course catalog (excluded from V4; browsers synthesize —
  revisit for serif faces).
- Toolbar math/formula support (KaTeX) — deferred from V2 for payload size; needs a
  player-budget answer first (rule A8).
- Process block two-card slide track (optional superset of the B2 single-card slide).
- CRDT rich-text path for `descriptionHtml` (schema keeps `description` plain-string
  canonical; see SPEC §4.6 Tier 2 Yjs constraint).
- Split cover layout variant (cover/hero exist; split was deferred).
- Settings drawer → Anvil `Drawer` swap + preview overlay dark-chrome retoken
  (D3/D5 leftovers).
- Retire `scripts/make-standalone.mjs` + `forge-review.html` once Codex confirms the
  normal dev stack (RUNBOOK) covers review needs.
- Reconcile the mobile sidebar breakpoint (player uses one value; historical docs cited
  both 720px and 768px — read `packages/player/src/styles.css` and standardize).

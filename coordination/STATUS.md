# Forge Build Status

Status claims cite runnable proofs. A claim without a proof is not a claim.

## Handoff status (2026-07-09, ADR 0005)

Claude's recovery + polish program is complete; Codex takes over from commit `8e1a00c`
(branch `main`, remote `https://github.com/simon-smithSC/forge_builder.git`).

### Done

- Recovery R0–R3: schema-canonical architecture, single shared renderer, real player
  runtime, full editor, `@forge/xapi` + `@forge/exporter`, in-browser publish.
  Proof: `pnpm verify`, `node e2e/xapi/golden-run.mjs`, `node e2e/exporter/build-run.mjs`.
- xAPI pipeline proven in the field: package uploaded to Stream Curatr, tracked launch,
  statements verified in Learning Locker.
- Rise parity P1–P7, player UX U1–U5, Anvil design system D1–D6 + beautification waves,
  motion primitives, rich text toolbar, font pipeline, schema v1.3.0 block features.
  Proof: gate table in `docs/RUNBOOK.md`; per-wave commits in `git log`.
- Documentation restructured for handoff (ADR 0005): executed plans deleted; rules in
  `docs/CODEX-RULES.md`; roadmap in `docs/ROADMAP.md`; operations in `docs/RUNBOOK.md`.

### Current state

- Schema `1.3.0`; all gates green at handoff (`node scripts/contract-check.mjs`,
  `node e2e/smoke/render-smoke.mjs`, plus the full table on the Mac).
- `services/api` is still the in-memory Phase 1 skeleton; publish is in-browser only.

### Next

See `docs/ROADMAP.md`. Item 1 is the R4 platform wave (Postgres/GCS, SSE presence +
lesson locks, server-side publish worker, Static Sites + Cloud Run deploy, Curatr
re-verification gate).

## Blocked

- Real Okta/Cloud Run gateway spike still requires deployed infrastructure (ADR 0001
  fallback defaults in force).

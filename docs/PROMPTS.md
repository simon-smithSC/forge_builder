# Codex Prompts

Copy-paste task templates. Each references docs/CODEX-RULES.md by rule number. Start every
session with the opening prompt.

## Opening prompt (every session)

```
Before doing anything else:
1. Read AGENTS.md, docs/CODEX-RULES.md, docs/SPEC.md, docs/ROADMAP.md, docs/RUNBOOK.md.
2. Confirm, in one paragraph each, your understanding of: the schema-change checklist
   (rule A2), the single-renderer invariant (A3), player self-containment (A5), the
   committed-artifact refresh list (C4), and the verification gates (D1).
3. Establish a green baseline: run node scripts/contract-check.mjs,
   node e2e/smoke/render-smoke.mjs, and pnpm build. If anything fails, STOP — report the
   failure and do not start feature work on a red baseline.
4. State which ROADMAP item you are picking up and its scope before writing code.
```

## Schema change

```
Task: <change>. This touches @forge/schema, so execute the FULL rule A2 checklist —
version bump in packages/schema/src/schemas.ts, migration + registry entry in
migrations.ts, migration test in index.test.ts, kitchen-sink fixture update, exporter
allowlist update in packages/exporter/src/compile.ts, and confirmation that
courseLifecycle.ts enterCourse and persistence.ts reloadServerCopy still migrate on load.
Optional booleans follow present-means-true (C2). Run the ENTIRE gate table (D1) plus the
runtime spot-check (D2). List each checklist item with proof before declaring done.
```

## New block family / variant

```
Task: add <family/variant>. The renderer lives ONLY in @forge/blocks (rule A3): registry
entry in packages/blocks/src (variants, palette, createDefaultPayload, validatePayload,
Renderer, contentWidth hint), payload schema in @forge/schema (this is a schema change —
rule A2 checklist applies), styles inside the band+column envelope (A4: no horizontal
padding/margin/max-width on the band chain). Decide scroll- vs interaction-consumption in
packages/player/src/progress.ts (A7). Editor gets a payload editor form, not a renderer.
Reachable from exactly one library category. Refresh the player runtime (C4). Gates: full
D1 table.
```

## Bug fix

```
Bug: <symptom>. Follow rule F1 — evidence before fix: reproduce it, capture the actual
bytes (rendered CSS, network response, DOM state, statement payload), and name the root
cause before proposing a change. Do not stack plausible fixes (the Times-font saga took
four wrong fixes; the root cause was a `*/` inside a CSS comment body — B7). Check the B7
landmine list first for CSS/font/fetch symptoms. Fix root cause with the smallest diff
(F3), add a regression test or smoke assertion where one is missing, run the D1 gates for
the affected area, and cite the incident in the commit message.
```

## Design-system change

```
Task: <change> in Anvil (@forge/ui). Tokens first: edit
packages/ui/src/tokens/anvil.tokens.json only — anvil.css and tokens.ts are generated
(rule B1); rebuild with pnpm -F @forge/ui build. No raw duration/easing/color literals in
components.css (B3); type roles stay longhands (B4); no new dependencies (B2); motion via
Presence/Collapse (B5); dark mode must keep working via the [data-theme="dark"] semantic
remap only (B6). Regenerate anvil-styleguide.html (node scripts/make-styleguide.mjs) and
log the decision in docs/design-system/decisions.md (F4). Gates: contract-check +
render-smoke.
```

## Player / xAPI change

```
Task: <change> in @forge/player or @forge/xapi. Constraints: the published package is
self-contained — zero --an- references and zero @forge/ui imports in packages/player/src
(rule A5); entrance timing values are LOCKED (A6); gating semantics changes need
gating.test.ts + e2e/player/gating-run.mjs (A7); statement shapes are pinned by the golden
run (A8); bundle stays under 300 KB gz. After the change: pnpm -F @forge/player
build:runtime and commit the regenerated runtime (C4). Gates: gating-run, golden-run,
exporter build-run, render-smoke, contract-check. Then publish a package and verify a
tracked launch in Stream Curatr + statements in Learning Locker (RUNBOOK "Publish flow").
```

## Pre-commit verification

```
Before committing, run and paste the results of: node scripts/contract-check.mjs;
node e2e/smoke/render-smoke.mjs; the change-type gates from rule D1; pnpm build; pnpm test.
Confirm: no generated file was hand-edited (B1), committed artifacts were refreshed if
their sources changed (C4 — especially player-runtime after any blocks/player change), no
new dependency slipped in without approval (C5), and the commit message cites the passing
gates (F3). If any gate is red, do not commit.
```

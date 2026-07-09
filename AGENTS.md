# Standing orders for agents working on Forge

Before ANY work: read `docs/CODEX-RULES.md` (binding, numbered rules), `docs/SPEC.md`
(the build contract), `docs/ROADMAP.md` (what to work on), `docs/RUNBOOK.md` (how to run
and verify everything). Session templates: `docs/PROMPTS.md`.

The rules most often violated — full text and WHY in CODEX-RULES:

1. **Content-model types live ONLY in `@forge/schema`** (rule A1). Never declare
   CourseDoc/Block/etc. anywhere else; never resurrect `editor/src/domain/courseModel.ts`.
2. **Schema changes run the FULL checklist** (A2): version bump + migration + migration
   test + kitchen-sink fixture + exporter allowlist in `packages/exporter/src/compile.ts`
   (an explicit allowlist — forgotten fields silently vanish from published packages) +
   editor load paths keep migrating.
3. **Block visuals live ONLY in `@forge/blocks`** (A3); editor and player mount the
   identical renderer. No `<Family>Renderer` in editor/player.
4. **Published player packages are self-contained** (A5): zero `--an-` references, zero
   `@forge/ui` imports in `packages/player/src`; copy values with `/* an-... */`
   provenance comments instead.
5. **Player entrance timings are LOCKED** (A6): 1s ease-out, 0.12s base + 0.15s stagger,
   IO rootMargin "2% 0px", 1000ms fallback. Measured from Rise; do not retune.
6. **Never hand-edit generated files** (B1/C4): `packages/ui/src/anvil.css`,
   `packages/ui/src/tokens.ts` (source: `anvil.tokens.json`), and
   `packages/editor/public/player-runtime/player.js|css`.
7. **Refresh the committed player runtime** after ANY `@forge/blocks` or `@forge/player`
   change: `pnpm -F @forge/player build:runtime` — or published packages ship stale
   visuals (C4).
8. **Never write the two-char sequence `*/` inside a CSS comment body** (B7) — it swallows
   the next rule via error recovery (the whole editor once rendered in Times). Also: no
   `inherit` in font-family lists; font stacks stay quote-free (E2).
9. **No localStorage for course data** (E3); IndexedDB journal only.
10. **Evidence before fix** (F1): reproduce and dump the actual bytes before changing code.

Verification is mandatory before every commit: `node scripts/contract-check.mjs` and
`node e2e/smoke/render-smoke.mjs` always; the change-type gates from rule D1 besides;
`pnpm build` + `pnpm test` before anything lands. Never start feature work on a red
baseline, and never commit with a red gate.

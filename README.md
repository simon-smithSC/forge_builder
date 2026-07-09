# Forge

Forge is a block-first eLearning authoring tool with native xAPI publishing: a Rise-like
WYSIWYG editor that publishes self-contained xAPI packages, proven against Stream Curatr
(LMS) and Learning Locker (LRS).

Start here:

- [docs/CODEX-RULES.md](docs/CODEX-RULES.md) — binding rules; read before writing code.
- [docs/SPEC.md](docs/SPEC.md) — the build contract.
- [docs/ROADMAP.md](docs/ROADMAP.md) — done / next.
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — servers, player-runtime refresh, verification, publish.
- [docs/PROMPTS.md](docs/PROMPTS.md) — agent session templates; [AGENTS.md](AGENTS.md) standing orders.
- [docs/adr/](docs/adr/0000-index.md) — architecture decisions; [docs/design-system/](docs/design-system/README.md) — Anvil.

## Workspace

- `packages/schema`: content model, validators, migrations, sanitizer, fixtures, IRI helpers.
- `packages/ui`: Anvil design system (tokens, primitives) — editor chrome only.
- `packages/blocks`: block registry + the single shared renderer per family (editor AND player).
- `packages/editor`: authoring SPA (Vite, port 5173).
- `packages/player`: static runtime bundled into published packages (self-contained).
- `packages/xapi`: launch parsing, statements, transport, State API, completion engine.
- `packages/exporter`: package compiler, tincan.xml, deterministic zip.
- `services/api`: FastAPI backend (port 8000; in-memory Phase 1 skeleton, see its README).
- `e2e`: plain-Node gate scripts (smoke, exporter, gating, xAPI golden) — no Playwright.
- `scripts`: `contract-check.mjs` (architecture contracts), styleguide/review generators.

## Commands

```bash
pnpm install
pnpm build            # turbo: all packages (required before e2e gates; dist/ is gitignored)
pnpm lint
pnpm test
pnpm contract-check   # node scripts/contract-check.mjs
pnpm smoke            # node e2e/smoke/render-smoke.mjs
pnpm verify           # contract-check + build/lint/test + smoke

pnpm -F @forge/editor dev            # editor on 127.0.0.1:5173 (API must run on 8000)
pnpm -F @forge/player build:runtime  # REQUIRED after any blocks/player change (see RUNBOOK)

# one-time, needs network: fetch webfont binaries (not committed)
node packages/ui/scripts/fetch-fonts.mjs             # Anvil UI fonts (Geist, JetBrains Mono)
node packages/player/scripts/fetch-course-fonts.mjs  # course theme WOFF2 catalog
```

API server setup and the full gate table live in [docs/RUNBOOK.md](docs/RUNBOOK.md).
Coordination artifacts (contracts, status) live in [coordination/](coordination/).

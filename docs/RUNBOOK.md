# Forge Runbook

Every command here was verified against `package.json` scripts and the actual file layout
on 2026-07-09. Run everything from the repo root unless noted.

## Prerequisites

- Node 22, pnpm 11.7.0 (`packageManager` in root `package.json`; CI uses exactly these —
  `.github/workflows/`).
- Python 3.12 for `services/api` (`requires-python` in `services/api/pyproject.toml`).
- One-time after cloning: `pnpm install`, then `pnpm build` (dist/ is gitignored; nothing
  runs without it), then the font fetches below if the WOFF2 binaries are missing.

## iCloud caveat (read this first)

The canonical checkout lives on iCloud Drive
(`~/Desktop/T&S/Rise_Rip` via CloudDocs), where file mtimes can lag behind writes. Two
consequences:

1. The Vite dev server sends `Cache-Control: no-store` (see `packages/editor/vite.config.ts`)
   because mtime skew made conditional requests revalidate days-old cached assets. Do not
   remove that header.
2. For heavy work, prefer a plain-disk clone (e.g. `~/forge-dev`) kept in sync with
   `git pull`. A fresh clone needs `pnpm install && pnpm build` before any e2e gate runs.

Git remote: `https://github.com/simon-smithSC/forge_builder.git` (push requires Simon's
credentials).

## Start the API server (port 8000)

```sh
# one-time venv setup (workspace-root .venv is the convention)
python3.12 -m venv .venv
.venv/bin/python -m pip install -e "services/api[dev]"

# run
.venv/bin/python -m uvicorn forge_api.main:app --app-dir services/api/src --reload
```

Serves `http://127.0.0.1:8000` (`/docs`, `/openapi.json`, public `/healthz`). Identity is
stubbed via forwarded headers (`X-Okta-Subject`, ...) — see `services/api/README.md`.
Storage is IN MEMORY: restarting the API loses all courses (Postgres is roadmap item 1).

API tests: `.venv/bin/python -m pytest services/api`

## Start the editor dev server (port 5173)

```sh
pnpm -F @forge/editor dev
```

Serves `http://127.0.0.1:5173`. Requests to `/api/*` are proxied to `127.0.0.1:8000` with
the `/api` prefix stripped (`packages/editor/vite.config.ts`) — the API must be running or
the course list fails.

## Refresh the player runtime (do not forget this)

```sh
pnpm -F @forge/player build:runtime
```

Bundles `packages/player/src/standalone.tsx` as an IIFE into
`packages/editor/public/player-runtime/player.js` + `player.css` (non-hashed; also copies
`packages/player/public/fonts/` in). These files are COMMITTED and the in-editor publish
flow (`publishAction.ts`) fetches them into every zip.

- **When**: after ANY change to `@forge/blocks` or `@forge/player`, including CSS.
- **If you forget**: the editor canvas and preview look right, but published packages ship
  the stale runtime — learners see old visuals/behavior. Commit the regenerated files with
  the source change (rule C4).

## Anvil token rebuild + styleguide

```sh
pnpm -F @forge/ui build          # two-pass: tsc, then node dist/tokens/build.js
node scripts/make-styleguide.mjs # regenerates anvil-styleguide.html (committed)
```

Edit only `packages/ui/src/tokens/anvil.tokens.json`; `src/anvil.css` and `src/tokens.ts`
are generated outputs (rule B1). Commit source + both outputs + styleguide.

## Font pipelines (network required, one-time / on catalog change)

```sh
# Anvil UI fonts (Geist Sans static weights + JetBrains Mono) -> packages/ui/src/fonts/
node packages/ui/scripts/fetch-fonts.mjs

# Course theme fonts (9 OFL faces) -> packages/player/public/fonts/
# + regenerates packages/editor/src/ui/course-fonts.css so catalog and css can't drift
node packages/player/scripts/fetch-course-fonts.mjs        # skips existing files
node packages/player/scripts/fetch-course-fonts.mjs --force     # re-download
node packages/player/scripts/fetch-course-fonts.mjs --css-only  # regen css, no network
```

After fetching course fonts, run `pnpm -F @forge/player build:runtime` so the binaries land
in `packages/editor/public/player-runtime/fonts/`. Missing binaries degrade gracefully
(fallback stacks + `font_missing` publish warnings).

## Full verification suite

```sh
pnpm verify   # contract-check + turbo build/lint/test + render-smoke
```

Individual gates (all plain Node scripts — no Playwright; they import built dist, so
`pnpm build` first):

| Command | Checks |
| --- | --- |
| `node scripts/contract-check.mjs` | architecture contracts (CODEX-RULES A1/A3/C3/E3/B7) |
| `node e2e/smoke/render-smoke.mjs` | every registry variant + kitchen-sink render via shared BlockView |
| `node e2e/smoke/fonts-smoke.mjs` | course font catalog / publish css helpers |
| `node e2e/smoke/richtext-smoke.mjs` | toolbar HTML output passes sanitizer + zod |
| `node e2e/exporter/build-run.mjs` | deterministic zip, tincan.xml interactions (writes /tmp/forge-package.zip) |
| `node e2e/player/gating-run.mjs` | continue-gating reveal semantics |
| `node e2e/xapi/golden-run.mjs` | golden statements + completion matrix |
| `pnpm test` / `pnpm -r test` | vitest: schema migrations, module identity, gating, exporter |

## Publish flow and LRS verification

1. In the editor: Publish → settings per SPEC §6.5 (tracking, reporting mode, exit link,
   hide cover, strict launch; profile is `forge-v1` only) → review warnings → download zip.
   The zip contains course data, assets, embedded fonts, `tincan.xml`, `index.html`, and
   the committed player runtime under `lib/`.
2. Upload to Stream Curatr as a tincan/xAPI package resource and launch it enrolled as a
   learner (tracked mode requires a real launch; opening `index.html` directly runs
   untracked with a banner).
3. Verify statements in Learning Locker: filter by the course activity IRI
   (`https://xapi.supercell.com/...`; Curatr overrides activity_id with its resource IRI
   and supplies registration — SPEC §13.2). Expect launched/progressed/completed plus
   cmi.interaction statements for quiz/KC answers.
4. Any player/xapi/exporter change is not "done" until this manual gate passes (rule D1
   covers the automated part; Curatr is the field proof).

## Everyday sequences

Blocks/player visual change:
`edit → pnpm -F @forge/blocks build && pnpm -F @forge/player build && pnpm -F @forge/player build:runtime → node scripts/contract-check.mjs && node e2e/smoke/render-smoke.mjs && node e2e/player/gating-run.mjs → commit source + runtime`

Schema change: follow CODEX-RULES A2 checklist end to end, then the FULL gate table.

Design-system change:
`edit anvil.tokens.json → pnpm -F @forge/ui build → node scripts/make-styleguide.mjs → contract-check + render-smoke → log decision in docs/design-system/decisions.md`

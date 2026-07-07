# Forge

Forge is a block-first eLearning authoring tool with native xAPI publishing.

The build contract is [docs/SPEC.md](docs/SPEC.md). Coordination artifacts live in [coordination/](coordination/).

## Workspace

- `packages/schema`: content model, validators, migrations, fixtures, IRI helpers.
- `packages/ui`: shared UI primitives.
- `packages/blocks`: block registry plus editor and player block components.
- `packages/editor`: authoring SPA.
- `packages/player`: static runtime player bundled into published packages.
- `packages/xapi`: launch parsing, statements, transport, State API, completion engine.
- `packages/exporter`: package compiler, tincan.xml, zip assembly helpers.
- `services/api`: FastAPI backend for courses, media, publish jobs, collaboration, and auth.
- `e2e`: Playwright, LRS harness, and package conformance tooling.

## Commands

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
```


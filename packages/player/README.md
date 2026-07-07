# @forge/player

Runtime UI for Forge courses: cover, sidebar navigation, lesson view, quiz
engine, xAPI tracking hooks, and the standalone shell that published
packages boot.

## Two build outputs

1. `pnpm --filter @forge/player build` - tsc library build (`dist/`),
   consumed by the editor preview and other packages. The library never
   ships @forge/xapi runtime code: `Player.tsx`, `QuizLessonView.tsx`, and
   `tracking.ts` use type-only xapi imports and receive the live tracker
   through `PlayerProps.tracking`.
2. `pnpm --filter @forge/player build:runtime` - Vite bundle of
   `src/standalone.tsx` (which DOES ship @forge/xapi) into
   `packages/editor/public/player-runtime/player.js` + `player.css`
   (non-hashed, IIFE). The editor publish dialog fetches these two files and
   embeds them as `lib/` assets in the exported xAPI zip.

IMPORTANT: `build:runtime` runs on the Mac (workspace host), not in the
sandbox. Run it after any player/blocks/xapi change, before publishing from
the editor; otherwise the publish dialog warns that the runtime bundle is
missing and produces a zip without `lib/player.js`.

```sh
pnpm --filter @forge/player build:runtime
# or, without pnpm script resolution:
cd packages/player && ../../node_modules/.bin/vite build
```

## Standalone launch flow (src/standalone.tsx)

- Reads `window.__FORGE_LAUNCH__` ({ courseDataUrl, buildId?, search })
  written by the exporter's index.html; falls back to
  `content/course-data.json` + `location.search` for the dev shell.
- Fetches course-data.json, reverses the published shape back into a
  CourseDoc (courseSettings -> settings), validates via @forge/schema.
- `parseLaunch(search)` decides tracked vs untracked (strictLaunch throws
  instead). Untracked renders the Player with `nullTracker` and the
  dismissible "Preview mode" banner.
- Tracked: reuses/persists the registration via the State API
  (readPersistedRegistration/persistRegistration), reads the state document
  for resume (bookmark, consumedBlockBitset per lesson, quiz attempt
  counts), creates the xAPI tracker, and writes debounced state documents
  from `onStateChange`.

## Dev shell

`vite` in this package serves `index.html`; drop a published
course-data.json under `packages/player/public/content/` and add launch
parameters to the URL to exercise tracked mode.

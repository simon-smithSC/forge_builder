# Coordination Requests

Agents add numbered requests here when they need an interface or artifact owned by another agent.

## Open

(none)

## Closed

- 1. Reference materials needed before golden parity work. Closed 2026-07-07: Simon supplied the Rise xAPI export (`example-course-xapi-CvTucFwB.zip`). Committed as `docs/reference/example-course-xapi.zip`, with `tincan.xml` copied from the zip root, `tc-config.js`, and `course.json` decoded from the base64 `__jsonp` payload in `scormcontent/runtime-data.js` (note: current Rise exports carry course data there, not base64-in-index.html as SPEC section 7 assumed).

- 2. Root package metadata owner: update `pnpm-lock.yaml` after `@forge/schema` moved `yjs` from `devDependencies` to runtime `dependencies`. Closed by orchestrator via `pnpm install`; exact filtered schema scripts now run without bypass flags.

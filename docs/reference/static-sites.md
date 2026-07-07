# Static Sites Constraints

Forge editor hosting uses Supercell Static Sites for the static SPA only.

Operational constraints:

- The editor deploys built files from `dist` to an internal `*.static.supercell.dev` site.
- The deployed bundle must contain no secrets, credentials, PII, GCS keys, or learner data.
- Static Sites serves files only. It does not run server logic.
- Persistence, media processing, publish jobs, authorization checks, and signed URLs belong in the Cloud Run API service.
- Okta SSO protects the editor. The API receives identity through forwarded gateway headers and verifies them server-side.
- Public constants such as the API base URL may be injected at build time. Secrets may not.
- Published xAPI packages must not be hosted with embedded LRS credentials. Launch credentials come from Stream Curatr at launch time.
- External stakeholder preview, if required, must use the approved external Static Sites tier and must remain untracked.

The concrete deployment workflow belongs to `.github/workflows/` and should follow the 10-line Static Sites workflow pattern with `source-dir: dist`.


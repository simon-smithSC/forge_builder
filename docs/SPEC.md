# Build Specification: Forge (working title)
## Block-based eLearning authoring tool with native xAPI publishing

Version 1.0 (draft for Codex build)
Owner: Simon Smith, T&S
Date: 4 July 2026

---

## 1. Purpose and scope

Forge is a web-based, block-first eLearning authoring tool. Authors compose courses from a library of content blocks in a WYSIWYG editor, then publish self-contained xAPI packages for delivery through Stream Curatr (LMS) with statements recorded in Learning Locker (LRS).

The reference product is Articulate Rise. The uploaded example export (`example-course-xapi-97C24s-3.zip`) defines the baseline: everything in that package must be reproducible by Forge. We are not cloning Rise, we are surpassing it. Section 12 lists the deliberate improvements.

Hard constraints:

1. **xAPI only.** No SCORM, no AICC, no cmi5 in v1. All tracking is native xAPI 1.0.3. No SCORM-driver shim layer (the reference package routes everything through a 450 KB `scormdriver.js` translating SCORM calls to xAPI; we implement xAPI directly).
2. **Hosting per Supercell Static Sites.** The editor frontend is a static SPA deployed to `*.static.supercell.dev` (internal tier, Okta SSO) via the 10-line GitHub Actions workflow (`source-dir: dist`). Static Sites serves files only: no server logic, no secrets in build output, no PII baked into the bundle. All persistence, asset storage, and publish jobs live in a separate backend service (Cloud Run, per the `sc-gcp-services-team/cloud-run-python-okta` reference), fronted by the same Okta gateway with the user identity forwarded to the app.
3. **Published packages must run in Stream Curatr** using the standard tincan launch mechanism (LRS `endpoint`, `auth`, `actor`, `activity_id`, `registration` passed as launch query parameters) and must produce statements that Learning Locker can aggregate with existing query patterns.

Out of scope for v1: real-time multi-author co-editing, SCORM export, AI content generation, mobile-native editor. The data model must not preclude any of these.

---

## 2. System architecture

Monorepo (pnpm workspaces + Turborepo):

```
forge/
  packages/
    schema/        # Content model: TypeScript types + JSON Schema + Zod validators + migrations
    ui/            # Shared design system components (editor + player where sensible)
    blocks/        # Block registry: definition, editor component, player component, xAPI hooks per block
    editor/        # Authoring SPA (React 18, Vite, TypeScript strict)
    player/        # Runtime player SPA (self-contained, dependency-light, embedded in exports)
    xapi/          # xAPI client: statement builder, LRS transport, State API, queue/retry, launch parsing
    exporter/      # Package builder: tincan.xml generator, asset collector, zip assembly
  services/
    api/           # FastAPI on Cloud Run: courses, media, publish jobs, versioning
  e2e/             # Playwright end-to-end tests + LRS conformance suite
  .github/workflows/  # Static Sites deploy (editor), Cloud Run deploy (api), CI
```

Runtime topology:

- **Editor SPA** at `https://forge.static.supercell.dev` (internal tier). Okta SSO automatic. Talks to the API over HTTPS with the Okta identity forwarded.
- **API service** on Cloud Run in the team's own GCP project. Owns: Postgres (course documents, versions, users, publish jobs), GCS bucket (media assets, published zips), publish worker. Never exposes GCS keys to the browser; uploads go through signed URLs minted per request.
- **Player** ships inside every published zip. Also served standalone by the editor for live preview (same code, preview data source instead of package data).
- **LRS** is Learning Locker, configured per-launch via query params. The tool itself never hardcodes LRS credentials.

Technology decisions (Codex agents must not deviate without an ADR):

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript strict everywhere; Python 3.12 for API | |
| Editor framework | React 18 + Vite | |
| Rich text | TipTap 2 (ProseMirror) | One shared editor config; output is sanitized HTML subset |
| Drag and drop | dnd-kit | Blocks, lesson outline, gallery items, quiz answers |
| State | Zustand + Immer; TanStack Query for server state | |
| Styling | Tailwind + CSS variables for theming | Player uses the same token set compiled standalone |
| Charts | Recharts (editor preview) and a small SVG renderer in player | Player must not ship Recharts; keep player bundle under 300 KB gz excluding media |
| API | FastAPI + SQLAlchemy + Alembic; Postgres 15; GCS | Matches cloud-run-python-okta reference |
| Validation | Zod (TS) generated from a single source; JSON Schema published from the same source | `packages/schema` is the single source of truth |
| Zip assembly | Server-side in publish worker (Python `zipfile`), deterministic ordering | Reproducible builds: same input, byte-identical zip except manifest timestamp |
| Testing | Vitest (unit), Playwright (e2e), Ruff+pytest (API) | |

---

## 3. Content model (`packages/schema`)

The schema mirrors the proven Rise shape (course → lessons → blocks → items) so authors migrating content find it familiar and so Learning Locker activity structures stay recognisable, but it is cleaned up and versioned.

### 3.1 Course document

```ts
interface CourseDoc {
  schemaVersion: string;          // semver, e.g. "1.0.0"; migrations in packages/schema/migrations
  id: string;                     // ULID
  title: string;
  description: string;
  defaultLocale: string;          // BCP 47, e.g. "en-US"
  theme: Theme;                   // colors, typefaces, spacing scale, logo
  labelSet: LabelSet;             // all learner-facing UI strings, localizable
  settings: CourseSettings;       // navigation mode (free | sequential), sidebar, search,
                                  // lesson count display, block entrance animation,
                                  // video playback speed control
  lessons: Lesson[];
  media: Record<string, MediaRef>; // normalized media registry, blocks reference by mediaId
  createdAt: string; updatedAt: string;
}

type Lesson = SectionHeader | BlocksLesson | QuizLesson;

interface BlocksLesson {
  type: "blocks";
  id: string; title: string; icon?: string;
  header?: {                       // schema v1.2.0: replaced headerImage (migrated)
    imageMediaId?: MediaId;
    backgroundColor?: string;
    overlayOpacity?: number;       // 0-100 scrim strength over the image
  };
  blocks: Block[];
}

interface QuizLesson {
  type: "quiz";
  id: string; title: string;
  settings: {
    passingScore: number;          // 0-100
    retryCount: number;            // -1 = unlimited
    revealAnswers: "all" | "none" | "afterFinalAttempt";
    shuffleAnswerChoices: boolean;
    randomizeQuestionOrder: boolean;
    questionPoolSize?: number;     // draw N of M (improvement over Rise)
    timeLimitSeconds?: number;     // optional timer (improvement)
  };
  questions: Question[];
}
```

### 3.2 Block envelope

Every block shares one envelope. Per-block payloads are discriminated unions validated by Zod.

```ts
interface Block<TPayload = unknown> {
  id: string;
  family: BlockFamily;             // registry key, e.g. "text", "gallery", "knowledgeCheck"
  variant: string;                 // e.g. "heading paragraph", "three column"
  payload: TPayload;               // typed per family+variant
  settings: BlockSettings;         // paddingTop/Bottom (0-5 scale, linkable),
                                   // backgroundColor, textColorMode ("auto" | explicit),
                                   // entrance animation override, anchorId (deep link)
  visibility?: VisibilityRule;     // conditional display (improvement, see 12)
  notes?: string;                  // author-only annotations, stripped on publish
}
```

### 3.3 Block library, v1 (full parity plus additions)

Parity set, matching every variant present in the example course:

| Family | Variants | Payload highlights |
|---|---|---|
| text | paragraph, heading, subheading, heading+paragraph, subheading+paragraph, two column | HTML fragments (sanitized subset) |
| impact (statement) | a, b, c, d, note | Styled pull-quote text |
| list | bulleted, numbered, checkboxes | Items of HTML fragments; checkbox state is cosmetic |
| image | hero, full width, centered, text aside, banner | mediaId, alt (required, see 12), caption, zoomOnClick |
| gallery | carousel (centered), two/three/four column grid | Array of images with captions |
| divider | line, numbered, spacer, continue button, screen bar | Continue gates progress until clicked; screen bar is an empty full-bleed band (spacing from block padding, background from settings) |
| multimedia | video, embed (iframe), attachment, code | Video: mediaId, poster, captions (VTT); embed: URL against an allowlist; attachment: mediaId + size + label; code: language + syntax highlighting + copy button |
| interactive | accordion, tabs | Items with title, rich description, optional image/audio |
| interactive-fullscreen | process, labeled graphic, timeline, sorting | Process: intro/steps/summary; labeled graphic: base image + markers at x/y % with title/description; timeline: events with optional label eyebrow, per-event startExpanded, block-level detailsAlwaysVisible (consumes by scroll when nothing is left to open); sorting: items → piles |
| flashcard | single card, grid, stack | Front/back, each text or full image |
| buttons | single button, button stack | Label + destination (URL, lesson id, mailto) |
| knowledgeCheck | multiple choice, multiple response, fill in the blank, matching | Inline ungraded checks; answers, per-answer feedback, correct feedback, incorrect feedback |
| chart | bar, line, pie | Items with label/value/color, axis labels, curve type; accessible data table fallback |

Additions (improvements, all v1):

| Family | Variants | Notes |
|---|---|---|
| table | basic, header row/col options | Rise has no table block; frequent authoring pain |
| audio | standalone audio | mediaId + transcript field |
| callout | info, warning, success, danger | For policy/escalation content |
| scenario | branching scene | Sequence of scenes: prompt + choices, each choice routes to another scene or continues; emits xAPI per choice. Minimal viable branching, not a full Storyline replacement |
| checklist (interactive) | task checklist | Learner-checkable, state persisted, optionally required for completion |

Quiz question types: MULTIPLE_CHOICE, MULTIPLE_RESPONSE, FILL_IN_THE_BLANK (multiple accepted answers, case sensitivity toggle), MATCHING, plus additions: SEQUENCING (ordering), NUMERIC (range or exact), LIKERT (survey, ungraded, still emits `answered`). Each question supports per-answer feedback, question-level feedback, optional media, and an optional rationale shown after answering.

### 3.4 Media registry

```ts
interface MediaRef {
  id: string;                      // content-hash based (sha256 prefix) for dedupe
  kind: "image" | "video" | "audio" | "attachment" | "captions";
  filename: string; mime: string; bytes: number;
  width?: number; height?: number; durationSeconds?: number;
  alt?: string;                    // canonical alt lives here, overridable per placement
  storageKey: string;              // GCS object key
  derived?: { thumbKey?: string; posterKey?: string; renditions?: Rendition[] };
}
```

Upload flow: editor requests a signed upload URL from the API, PUTs the file, API verifies, computes hash, generates derived assets (thumbnails, video poster, responsive image renditions via worker). Identical files dedupe by hash. Size limits: images 20 MB, video 500 MB, attachments 100 MB (configurable).

---

## 4. Editor application (`packages/editor`)

### 4.1 Layout

Three-region layout matching the familiar Rise pattern:

- **Left sidebar:** course outline. Sections and lessons, drag-to-reorder, inline rename, add lesson/section/quiz, per-lesson kebab menu (duplicate, delete, move). Collapsible.
- **Center canvas:** the lesson being edited, rendered exactly as the player renders it (same block components in edit mode). This is the WYSIWYG surface.
- **Right/contextual panel:** block settings for the selected block (padding, colors, variant switch within family, block-specific options). Opens on block select, closable.

Top bar: course title (inline editable), autosave status, undo/redo, preview (desktop/tablet/mobile widths, opens the real player against draft data), theme editor, publish button, version history.

### 4.2 Block interaction model

- Hover between blocks reveals an insert affordance; clicking opens the **block palette** (searchable, grouped by family, with visual thumbnails, recent/favorites section).
- Each block gets a hover toolbar: drag handle, duplicate, delete, move up/down, convert variant, copy block, and "save to shared blocks" (team-level reusable block library, an improvement over Rise's per-author blocks).
- All text is edited in place with TipTap. Allowed marks: bold, italic, underline, strikethrough, code, link, superscript/subscript, text color from theme palette, highlight. Allowed nodes per context (e.g. list items disallow headings). Paste sanitization strips Word/Google Docs cruft. Markdown shortcuts (`## `, `- `, `1. `, `> `) supported.
- Media slots open the **media picker**: tabbed dialog with (a) course media library, (b) upload (drag-drop, multi-file, progress), (c) URL import, (d) team shared library. Image edit basics: crop, focal point. Alt text field is presented at insert time.
- Undo/redo is a command stack over Immer patches, min 100 steps, survives lesson switches within a session.
- Autosave: debounced 2 s after last change, PATCH of changed lessons only, optimistic with conflict detection via document revision number (last-write-wins is not acceptable; on conflict, prompt with diff summary). Full persistence and recovery model in 4.5.

### 4.3 Course-level tooling

- **Theme editor:** primary color, heading/body/UI typefaces (system + uploaded WOFF2), derived palette with automatic contrast checking (warn below WCAG AA).
- **Label set editor:** every learner-facing string ("Continue", "Submit", "Correct", quiz messaging) editable and exportable/importable as JSON for translation.
- **Version history:** automatic snapshot on publish and manual snapshots; restore creates a new revision (never destructive). Retention: 50 snapshots or 12 months.
- **Course settings:** navigation mode (free vs sequential), sidebar behavior, search on/off, lesson counts, entrance animation, video playback speed control.
- **Accessibility checker (improvement):** on-demand scan flagging missing alt text, low-contrast theme combinations, videos without captions, charts without data labels, and empty link labels. Publish shows a warning summary; authors can proceed but the report is attached to the publish record.

### 4.4 Roles and access

Okta identity from the gateway header. Roles: Owner, Editor, Reviewer (comment-only), per course. Course list is the editor home: cards with cover image, last edited, publish status. Reviewer mode renders the player with an inline commenting layer (comments anchored to block ids, stored via API, resolvable).

### 4.5 Authoring persistence: save, resume, recover

Authoring work must never be lost and must be resumable from any device. Four layers, all v1:

1. **Continuous draft state.** The course document is always the live draft; there is no explicit "save" action. Autosave (4.2) PATCHes changed lessons with the document revision number. Publishing snapshots the draft (section 7); the draft continues evolving independently. The course card and editor top bar show "All changes saved" / "Saving..." / "Offline, changes queued" states.

2. **Write-ahead journal (crash and offline recovery).** Every local mutation is appended to an IndexedDB journal (per course, per user) before the autosave PATCH is attempted, and pruned on server acknowledgement. On editor load, if the journal contains unacknowledged entries newer than the server revision (browser crash, network loss, laptop sleep mid-save), the editor offers "Restore unsaved changes from this device" with a summary of affected lessons. Journal entries are the same Immer patch format as the undo stack, so restore replays them onto the fetched document. Journal capped at 5 MB per course, oldest-first eviction with a warning.

3. **Editing session resume.** The API stores a small per-user, per-course session document (last open lesson, scroll anchor, selected block, panel state, updated on a 10 s heartbeat). Reopening a course, on any device, lands the author exactly where they left off. Session docs are user-private and excluded from publish and version snapshots.

4. **Checkpoints.** Version history (4.3) covers deliberate restore points: automatic snapshot on publish, manual "Save checkpoint" with an optional note, and a rolling automatic checkpoint every 30 minutes of active editing. Restore is always non-destructive (creates a new revision on top).

### 4.6 Multi-author collaboration

Collaboration ships in two tiers. Tier 1 is a v1 requirement and uses only REST plus server-sent events, so it carries no infrastructure risk under the Static Sites + Cloud Run split. Tier 2 (live co-editing) is designed for now and built later; the v1 data model must not block it.

**Tier 1 (v1): presence and lesson-scoped editing**

- **Presence.** The editor subscribes to `GET /courses/{id}/events` (SSE). The API fans out presence (who has the course open, which lesson each person is in), lock changes, comment activity, and lesson-saved notifications. Client heartbeats every 10 s via the session update; missing three heartbeats marks the user away. Avatars render in the top bar (course level) and next to lessons in the outline (lesson level). If SSE through the Okta gateway proves unreliable, the client degrades to 15 s polling of the same event feed; the client abstraction (`PresenceTransport`) hides which is in use.
- **Lesson editing locks.** The unit of concurrent editing is the lesson, matching the save granularity. Opening a lesson for editing acquires a soft lock (`POST /courses/{id}/lessons/{lessonId}/lock`, TTL 60 s, renewed by heartbeat). Other authors see the lesson live-rendered but read-only, with "Suzi is editing" and a **Request control** action: the holder gets a prompt and can hand over; an unanswered request auto-transfers after 60 s if the holder's heartbeat has lapsed. Locks are advisory but enforced server-side at write time: a PATCH without the current lock token is rejected 423, and the existing 409 revision-conflict path (4.2) remains the safety net for races around lock expiry.
- **Course-structure operations** (reorder lessons, rename course, settings, theme, label set) are quick transactions guarded by optimistic revision checks only; no lock needed. Structural changes stream to all connected editors through the SSE feed and are applied to their outline immediately.
- **Different lessons, same course** therefore just works: each author holds their own lesson lock, saves interleave safely on revision numbers, and everyone watches the outline update live.
- **Awareness of stale views.** When someone else saves a lesson you are viewing read-only, it refreshes in place. When a lock you were waiting on releases, the outline indicates the lesson is now free.
- **Review workflow** (existing 4.4): Reviewer role, block-anchored comments with resolve, and the publish record's accessibility report give the SME calibration loop (author, reviewer, sign-off) a home without leaving the tool.

**Tier 2 (v2, designed for now): real-time co-editing within a lesson**

- Target: character-level concurrent editing, Google Docs style, using Yjs CRDTs with TipTap's collaboration and collaboration-cursor extensions (first-class, proven pairing). Each lesson becomes a Y.Doc; block structure as a Y.Array of Y.Maps, rich text fields as XmlFragments.
- Transport: y-websocket server colocated in the Cloud Run API service. Cloud Run supports websockets (hour-scale connection limits require transparent reconnect and Yjs sync-on-reconnect, which Yjs handles natively). **Open question 13.6:** whether the Okta gateway in front of Cloud Run passes websocket upgrades; if not, the documented fallback is a separate authenticated endpoint path or Yjs over SSE + POST (y-protocols is transport-agnostic).
- Persistence: Y.Doc updates appended to a Postgres update log with periodic compaction into snapshots; the canonical JSON lesson document (the shape everything else consumes: schema validation, exporter, player preview) is derived from the Y.Doc on save and remains the single source of truth for publishing. This derivation requirement is a **v1 schema constraint**: lesson and block payloads must stay losslessly representable as Yjs types (no exotic structures, ids on every list item, rich text as sanitized HTML fragments convertible to/from ProseMirror JSON). A1 enforces this with a round-trip test.
- Migration path: Tier 2 replaces the lesson lock with shared editing per lesson; presence, structure operations, comments, journal, and sessions carry over unchanged.

---

## 5. Runtime player (`packages/player`)

One player codebase serves three contexts: editor live preview, standalone preview links, and the published package. Requirements:

- Self-contained: in a published zip it runs from static files with zero external network calls except the LRS and any author-embedded iframes. No CDN fonts, no telemetry (contrast with the reference package's Articulate telemetry: we ship none).
- Renders the cover page (title, description, duration estimate, resume button), lesson navigation sidebar, and all blocks per theme.
- Progress model: a lesson is complete when all its blocks have been "consumed" (scrolled into view; interactive blocks require interaction; continue dividers require click; knowledge checks require an answer). Course progress = weighted lesson completion. Sequential mode locks future lessons until prior completion.
- Resume: on launch, restore position and interaction state (see 6.4). Learner sees "Pick up where you left off".
- Quiz engine: attempts, scoring, passing score, retry limits, answer reveal policy, shuffle, random order, optional pool and timer. Result screen with per-question review as allowed by reveal policy.
- Accessibility: full keyboard operability, visible focus, ARIA per APG patterns for accordions/tabs/dialogs/carousels, `prefers-reduced-motion` respected, captions rendered on video, chart alt table toggle. Target WCAG 2.2 AA.
- Performance budget: first contentful paint under 1.5 s on the reference package over corporate network; player JS under 300 KB gz; media lazy-loaded; responsive image renditions used where available.
- Browser support: evergreen Chrome/Edge/Firefox/Safari, plus embedded LMS webviews (test in Stream Curatr specifically).

---

## 6. xAPI implementation (`packages/xapi`)

This is the heart of the tool and must be treated as a first-class deliverable with its own conformance tests.

### 6.1 Launch

Published packages launch via `index.html` reading standard tincan launch query parameters:

```
index.html?endpoint=<LRS endpoint>&auth=<Basic ...>&actor=<Agent JSON>&activity_id=<course IRI>&registration=<uuid>
```

All parameters URL-decoded and validated. Missing `endpoint`/`actor` puts the player in **untracked preview mode** with a visible banner rather than a hard failure (improvement over the reference package's "Course launched outside of a supported LMS" dead end; a `strictLaunch` publish flag can restore hard-fail behavior).

### 6.2 Activity IRI scheme

Stable, meaningful IRIs (improvement over Rise's `http://<random>_rise`):

```
Course:      https://xapi.supercell.com/courses/{courseId}
Lesson:      https://xapi.supercell.com/courses/{courseId}/lessons/{lessonId}
Block:       https://xapi.supercell.com/courses/{courseId}/lessons/{lessonId}/blocks/{blockId}
Interaction: https://xapi.supercell.com/courses/{courseId}/interactions/{questionId}
```

The course IRI doubles as the `activity_id` in `tincan.xml` and remains constant across republish (versions communicated via context extensions, not IRI churn), so Learning Locker longitudinal queries keep working.

### 6.3 Statement design

| Event | Verb | Object | Result/notes |
|---|---|---|---|
| Launch | `http://adlnet.gov/expapi/verbs/launched` | course | context: registration, courseVersion extension, package build id |
| Session start | `.../initialized` | course | |
| Lesson opened | `.../experienced` (or `https://w3id.org/xapi/dod-isd/verbs/navigated`) | lesson | |
| Lesson completed | `.../completed` | lesson | result.completion=true, duration |
| Course progress | `.../progressed` | course | result.extensions progress 0-100, emitted at 10% steps and lesson boundaries |
| Knowledge check / quiz answer | `.../answered` | interaction activity, `cmi.interaction` typed | result.success, result.response per xAPI interaction formats, result.score for quiz questions, attempt number in context extension |
| Quiz submitted | `.../completed` | quiz lesson | result.score.scaled/raw/min/max |
| Quiz outcome | `.../passed` or `.../failed` | course or quiz per reporting setting | see 6.5 |
| Course completed | `.../completed` | course | duration from session accumulation |
| Session end | `.../terminated` | course | fired on pagehide via sendBeacon-compatible transport |
| Scenario choice | `.../responded` | scene interaction | choice id in response (new block type) |

Interaction definitions in statements carry full `cmi.interaction` metadata (interactionType, choices, correctResponsesPattern) matching what `tincan.xml` declares, exactly as the reference does, so LL dashboards that read `object.definition` keep functioning.

Transport: batched queue with localStorage persistence, retry with exponential backoff, flush on visibility change and pagehide, at-least-once delivery with statement UUIDs so LRS dedupe is safe.

**Compatibility note for Codex:** a `statementProfile` publish option offers `forge-v1` (above) and `rise-compat` (verb/object shapes mimicking the Rise SCORM-driver output) so existing Learning Locker queries can be migrated gradually. Default `forge-v1`.

### 6.4 State (resume) via the xAPI State API

Replace the reference package's LZW-compressed SCORM suspend-data hack with the real thing:

- `PUT /activities/state` documents keyed per (activity, agent, registration): `bookmark` (lesson + scroll anchor), `progress` (per-lesson block consumption map), `quiz` (attempt history), `interactions` (widget states worth restoring).
- Written debounced (5 s) and at lesson boundaries; read once at launch.
- Versioned envelope with schema id so player upgrades can migrate old state.
- Total state kept under 64 KB by storing consumption as bitsets keyed by block index.

### 6.5 Completion and reporting (publish settings parity)

Publish settings replicate the reference UI and semantics:

- **Tracking:** (a) course completion at N% of lessons (default 100), or (b) quiz result from a designated quiz lesson.
- **Reporting mode:** `passed/incomplete`, `passed/failed`, `completed/incomplete`, `completed/failed`. This maps which verb fires on success and whether a negative statement fires on failing the tracked quiz with no retries remaining.
- **Exit course link** on/off, **hide cover page** on/off, **strict launch** on/off.
- No usage-data toggle: Forge ships zero telemetry in packages.

### 6.6 tincan.xml generation (`packages/exporter`)

Generated per publish: course activity (name, description, `launch` pointing at `index.html`), one `module` activity per lesson, one `cmi.interaction` activity per question with interactionType, correctResponsesPattern, and component lists (choices/source/target) exactly per the tincan.xsd, matching the reference file's structure. XML built with a proper serializer, never string templates; escape everything.

---

## 7. Publishing pipeline

Authors click Publish → settings dialog (7 above) → API enqueues a publish job:

1. Snapshot the course document (immutable version row).
2. Validate: schema, broken media refs, empty required fields, accessibility report.
3. Collect assets: referenced media only, renditions included, filenames content-hashed.
4. Compile `course-data.json` (published shape: notes stripped, drafts of hidden blocks excluded, media rewritten to package-relative paths).
5. Copy player bundle (built once per release, versioned) + inject course data reference (JSON file, not base64-in-HTML: the reference embeds a base64 blob inside index.html which bloats the document and breaks caching; we ship `content/course-data.json` fetched by the player, with an inline fallback only for `file://` preview).
6. Generate `tincan.xml`.
7. Zip deterministically, store in GCS, record checksum.
8. Author downloads the zip and uploads to Stream Curatr (v1). **v1.1:** direct "Push to Stream Curatr" using the existing Stream API integration (create/update course resource), gated behind a feature flag.

Package layout:

```
package.zip
├── tincan.xml
├── index.html
├── content/course-data.json
├── assets/{hash}.{ext}...
└── lib/player.{hash}.js / player.{hash}.css / fonts/
```

Also produced per publish: a **web preview deployment** (optional) publishing the untracked package to a stakeholder-viewable location. Internal reviewers use editor preview links; external (BPO) review, if needed, goes through the external Static Sites tier following its onboarding rules. Never place tracked packages with LRS credentials on Static Sites: launch credentials only ever come from the LMS at launch time.

---

## 8. Backend API (`services/api`)

FastAPI on Cloud Run behind the Okta gateway (identity via forwarded headers, verified per the reference implementation). Postgres (Cloud SQL) + GCS.

Resources (REST, JSON, OpenAPI generated):

```
GET/POST           /courses
GET/PATCH/DELETE   /courses/{id}
GET/PUT            /courses/{id}/lessons/{lessonId}       # granular saves
POST               /courses/{id}/duplicate
GET/POST           /courses/{id}/versions                 # snapshots, restore
POST               /media/uploads                         # returns signed URL + mediaId
GET                /media/{id}
POST               /courses/{id}/publish                  # job; GET /publish-jobs/{id}
GET                /courses/{id}/packages                 # download links (signed)
GET                /courses/{id}/events                   # SSE: presence, locks, saves, comments
GET/PUT            /courses/{id}/session                  # per-user editing session (resume state)
POST/DELETE        /courses/{id}/lessons/{lessonId}/lock  # acquire/renew/release; request-control flow
GET/POST           /courses/{id}/comments                 # review comments
GET/POST           /shared-blocks                         # team block library
```

Cross-cutting: revision numbers for optimistic concurrency; lesson write endpoints require a valid lock token (423 otherwise); audit log of who changed what; per-course role checks; request/response validation from the shared JSON Schema; rate limiting on uploads. Secrets in Secret Manager, never in the repo, never in the static bundle (per the Static Sites data-protection warning).

---

## 9. Deployment

- **Editor:** GitHub Actions workflow per Static Sites docs: build (`pnpm build` for `packages/editor`), `source-dir: dist`, internal tier, push-to-main deploy, SPA routing handled by the gateway's index.html fallback. API base URL injected at build time as a public, non-secret constant.
- **API:** Cloud Build/Actions deploy to Cloud Run, migrations via Alembic on release, staging + production environments.
- **CI:** typecheck, lint, unit tests, schema validation of fixtures, player bundle-size check, Playwright smoke, and the xAPI conformance suite (section 10) on every PR.

---

## 10. Testing and acceptance

1. **Golden package test:** author a course reproducing every block in the example export, publish, and assert: valid tincan.xml against tincan.xsd; package launches from a local LRS test harness (containerized LRS or mocked endpoint); statement sequence for a scripted playthrough matches a stored golden statement log (ignoring timestamps/UUIDs).
2. **Resume test:** mid-course exit and relaunch restores lesson, scroll anchor, quiz attempt state via State API.
3. **Reporting matrix test:** all 4 reporting modes × both tracking modes fire exactly the expected verbs.
4. **Stream Curatr integration test (manual gate):** upload package, launch as a test learner, verify statements in Learning Locker and completion in Stream.
5. **Accessibility:** axe-core clean on player and editor primary flows; manual keyboard pass per release.
6. **Editor e2e:** create course, add each block family, edit rich text, upload media, reorder, undo/redo, autosave/conflict, publish.

Definition of done for v1: all of the above green, plus the golden package plays end to end in Stream Curatr with correct Learning Locker data.

---

## 11. Milestones

- **M1 Foundations:** schema package, API skeleton with auth, editor shell with outline + text/image/list blocks, autosave, write-ahead journal, session resume.
- **M2 Block library:** full parity block set, media pipeline, theme system, player rendering all blocks.
- **M3 Tracking:** xapi package, launch handling, statements, State API resume, quiz engine.
- **M4 Publishing:** exporter, tincan.xml, publish jobs, settings parity, golden package test passing.
- **M5 Polish:** additions (table, audio, callout, scenario, checklist, new question types), presence + lesson locks + request-control (Tier 1 collaboration), accessibility checker, version history, review comments, Stream Curatr manual gate.

Tier 2 real-time co-editing is a post-v1 milestone (M6) contingent on open question 13.6 and the Yjs round-trip constraint holding through M5.

---

## 12. Deliberate improvements over the reference product

For traceability, everything beyond Rise parity in one list:

1. Native xAPI runtime, no SCORM-driver shim; State API resume instead of LZW suspend data.
2. Stable, human-readable activity IRIs; course version in context extensions, not the IRI.
3. Statement batching, offline queue, sendBeacon flush, at-least-once delivery.
4. `rise-compat` statement profile for Learning Locker continuity during migration.
5. Untracked preview mode instead of hard launch failure (with strict mode available).
6. New blocks: table, audio, callout, scenario branching, learner checklist.
7. New question types: sequencing, numeric, Likert survey; question pools and quiz timer.
8. Required alt text workflow + course accessibility checker + WCAG 2.2 AA player target.
9. Video captions (VTT) as a first-class media type; transcripts on audio.
10. Team-shared block library and label sets exportable for translation.
11. Version history with restore; review/comment mode for stakeholders.
12. Deterministic, cacheable packages (JSON data file, hashed assets) instead of base64-in-HTML.
13. Zero third-party telemetry in published packages.
14. Conflict-safe autosave with revisions (Rise is last-write-wins).
15. Direct Stream Curatr push (v1.1) removing the download/upload round trip.
16. Crash-proof authoring: local write-ahead journal with restore, offline change queueing.
17. Cross-device editing session resume (reopen a course exactly where you left off).
18. Multi-author collaboration: presence, lesson locks with request-control handover, live outline updates; data model ready for CRDT real-time co-editing in v2.

---

## 13. Open questions (answer before M3)

1. IRI domain: is `https://xapi.supercell.com/...` acceptable as a namespace, or should we mint under an existing internal profile? (IRIs need not resolve, but must be stable.)
2. Does Stream Curatr's tincan launch pass `registration`? Verify against a live launch; if absent, the player generates one per attempt and persists it in State under a fixed key.
3. Which existing Learning Locker dashboards must keep working day one? Determines how much of `rise-compat` is required for launch vs deferrable.
4. External review tier: do BPO SMEs (e.g. TELUS calibration) need pre-publish preview access, and if so via external Static Sites tier or via Stream Curatr draft courses?
5. Retention policy for published packages and versions in GCS.
6. Does the Okta gateway in front of Cloud Run pass SSE streams and websocket upgrades? SSE affects Tier 1 presence (fallback: polling, already specced); websockets gate Tier 2 co-editing (fallback: Yjs over SSE + POST). Verify both with a spike in M1.

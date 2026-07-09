# Forge Coordination Contracts

These contracts freeze the cross-package interfaces. Changes require an ADR. Enforced mechanically by `scripts/contract-check.mjs`; verified against the code 2026-07-09 (ADR 0005 handoff). Rule numbers in `docs/CODEX-RULES.md` cite this file.

## Package Public APIs

Every package exports its public API from `src/index.ts`. Cross-package deep imports are forbidden.

Published package names:

- `@forge/schema`
- `@forge/ui`
- `@forge/blocks`
- `@forge/editor`
- `@forge/player`
- `@forge/xapi`
- `@forge/exporter`

## Content Model Boundary

`@forge/schema` owns all content types, validators, JSON Schema output, fixtures, migrations, IRI helpers, and sanitizer configuration.

Required exports:

```ts
export type CourseDoc;
export type Lesson;
export type BlocksLesson;
export type QuizLesson;
export type Block;
export type BlockFamily;
export type Question;
export type Theme;
export type LabelSet;
export type MediaRef;
export type PublishSettings;
export type StateDocumentEnvelope;

export const courseDocSchema: unknown;
export const publishSettingsSchema: unknown;
export function validateCourseDoc(input: unknown): CourseDoc;
export function migrateCourseDoc(input: unknown): CourseDoc;
export function buildCourseIri(courseId: string): string;
export function buildLessonIri(courseId: string, lessonId: string): string;
export function buildBlockIri(courseId: string, lessonId: string, blockId: string): string;
export function buildInteractionIri(courseId: string, questionId: string): string;
```

`courseDocSchema` and `publishSettingsSchema` may be Zod schemas or an adapter during Phase 1, but JSON Schema files emitted to `packages/schema/dist/json/` are the API validation source.

## Block Registry Contract

`@forge/blocks` owns registry metadata and shared presentational rendering. Editor affordances wrap shared renderers instead of forking visuals.

As built (`packages/blocks/src/registry.ts`, `context.ts`, `index.ts`):

```ts
export interface BlockRegistryEntry {
  family: BlockFamily;
  variants: readonly string[];
  palette: PaletteMeta; // label, group, description, lucide icon name
  createDefaultPayload: (variant: string) => unknown;
  validatePayload: (payload: unknown, variant: string) => unknown;
  /** THE single renderer, mounted by editor canvas AND player (rule A3). */
  Renderer: ComponentType<BlockRendererProps>;
  /** Content column width hint: "column" | "wide" | "full" (per variant). */
  contentWidth?: ContentWidthHint;
}

export const blockRegistry: Record<BlockFamily, BlockRegistryEntry>;
export { BlockView }; // band + column envelope wrapping Renderer

export interface RenderContext {
  mode: "edit" | "player"; // toggles affordance hooks, never visuals
  inlineEditing?: InlineEditingPort; // editor-only; player never provides it
  theme: Theme;
  labels: LabelSet;
  media: Record<string, MediaRef>;
  resolveMediaUrl: (mediaId: string) => string | undefined;
  events: BlockEvents; // onInteracted / onCompleted / onNavigateToLesson
  consumedBlockIds: ReadonlySet<string>;
  videoPlaybackSpeedControl?: boolean;
}
```

The single-renderer property is enforced by `scripts/contract-check.mjs` rule 4 and `packages/editor/src/moduleIdentity.test.ts`.

## TrackingPort Contract

The player never imports xAPI transport details directly. It calls a tracking port supplied by `@forge/xapi` or a null preview implementation.

```ts
import type { CourseDoc, Lesson, PublishSettings, StateDocumentEnvelope } from "@forge/schema";

export interface TrackingPort {
  mode: "tracked" | "untracked";
  initialize(input: {
    course: CourseDoc;
    settings: PublishSettings;
    launchedAt: string;
  }): Promise<StateDocumentEnvelope | null>;
  lessonOpened(lesson: Lesson): Promise<void>;
  blockConsumed(input: { lessonId: string; blockId: string; percentComplete: number }): Promise<void>;
  interactionAnswered(input: {
    lessonId: string;
    questionId: string;
    response: string;
    success?: boolean;
    score?: { raw: number; min: number; max: number; scaled: number };
    attempt: number;
  }): Promise<void>;
  quizCompleted(input: {
    lessonId: string;
    score: { raw: number; min: number; max: number; scaled: number };
    passed: boolean;
    attempt: number;
  }): Promise<void>;
  progressChanged(percentComplete: number): Promise<void>;
  courseCompleted(): Promise<void>;
  persistState(state: StateDocumentEnvelope): Promise<void>;
  terminate(durationSeconds: number): Promise<void>;
}

export interface LaunchParams {
  endpoint: string;
  auth: string;
  actor: unknown;
  activityId: string;
  registration?: string;
}

export function parseLaunchParams(search: string, strictLaunch: boolean): LaunchParams | null;
```

## REST Surface

All responses are JSON. Mutations require revision numbers unless noted.

```txt
GET    /me
GET    /courses
POST   /courses
GET    /courses/{courseId}
PATCH  /courses/{courseId}
DELETE /courses/{courseId}
GET    /courses/{courseId}/lessons/{lessonId}
PUT    /courses/{courseId}/lessons/{lessonId}
POST   /courses/{courseId}/duplicate
GET    /courses/{courseId}/versions
POST   /courses/{courseId}/versions
POST   /media/uploads
GET    /media/{mediaId}
POST   /courses/{courseId}/publish
GET    /publish-jobs/{jobId}
GET    /courses/{courseId}/packages
GET    /courses/{courseId}/events
GET    /courses/{courseId}/session
PUT    /courses/{courseId}/session
POST   /courses/{courseId}/lessons/{lessonId}/lock
DELETE /courses/{courseId}/lessons/{lessonId}/lock
GET    /courses/{courseId}/comments
POST   /courses/{courseId}/comments
GET    /shared-blocks
POST   /shared-blocks
```

Common envelopes:

```ts
export interface Revisioned<T> {
  revision: number;
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
```

Conflict responses:

- `409` revision conflict with `serverRevision` and `clientRevision`.
- `423` lesson locked with `holder`, `lessonId`, and `lockExpiresAt`.

## PresenceTransport and Locks

Editor collaboration uses this client-facing abstraction:

```ts
export interface PresenceTransport {
  connect(courseId: string): void;
  disconnect(): void;
  onEvent(handler: (event: CourseEvent) => void): () => void;
}

export type CourseEvent =
  | { type: "presence.changed"; users: PresenceUser[] }
  | { type: "lesson.locked"; lessonId: string; holder: PresenceUser; expiresAt: string }
  | { type: "lesson.unlocked"; lessonId: string }
  | { type: "lesson.saved"; lessonId: string; revision: number; author: PresenceUser }
  | { type: "comment.changed"; commentId: string; lessonId: string; blockId: string }
  | { type: "outline.changed"; revision: number };

export interface PresenceUser {
  subject: string;
  displayName: string;
  avatarUrl?: string;
  courseRole: "owner" | "editor" | "reviewer";
  lessonId?: string;
  state: "active" | "away";
}
```

SSE is the preferred transport. Polling every 15 seconds is the fallback if the gateway spike rejects streaming.

Locks are lesson scoped:

- TTL is 60 seconds.
- Heartbeat renewal runs every 10 seconds.
- Missing three heartbeats marks a user away.
- A lesson write without the current lock token returns `423`.
- If a lock expires during a race, the write then falls through to normal revision handling.

## Publish Settings

```ts
export interface PublishSettings {
  tracking:
    | { mode: "courseCompletion"; requiredLessonPercent: number }
    | { mode: "quizResult"; quizLessonId: string };
  reportingMode:
    | "passed-incomplete"
    | "passed-failed"
    | "completed-incomplete"
    | "completed-failed";
  exitCourseLink: boolean;
  hideCoverPage: boolean;
  strictLaunch: boolean;
  statementProfile: "forge-v1" | "rise-compat";
}
```

## Ownership (post-handoff)

The multi-agent Phase 1 ownership split is retired (ADR 0005). One agent works the repo at
a time; `docs/SPEC.md`, this file, and `docs/CODEX-RULES.md` govern; Simon approves
contract changes and new dependencies.

Notes:

- `statementProfile` keeps `"rise-compat"` in the schema enum for forward compatibility,
  but only `"forge-v1"` ships (ADR 0003); the editor offers only `forge-v1`.
- The REST surface above includes R4 endpoints (publish jobs, locks, comments, events,
  versions, shared blocks) that `services/api` has not implemented yet — see
  `services/api/README.md` and `docs/ROADMAP.md` item 1.


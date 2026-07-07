// @forge/xapi: native xAPI 1.0.3 client per SPEC 6 (forge-v1 profile only,
// ADR 0003). Launch parsing, statement builder, batched LRS transport,
// State API resume, completion/reporting engine, tracking facade. Zero UI.

export {
  LaunchError,
  generateUuid,
  parseActor,
  parseLaunch,
  type LaunchContext,
  type LaunchResult,
  type ParseLaunchOptions,
  type XapiAgent,
} from "./launch.js";

export type {
  AnsweredComponent,
  AnsweredInput,
  AnsweredInteraction,
  LanguageMap,
  QuizScore,
  XapiActivity,
  XapiActivityDefinition,
  XapiContext,
  XapiContextActivities,
  XapiInteractionComponent,
  XapiInteractionType,
  XapiResult,
  XapiScore,
  XapiStatement,
  XapiVerb,
} from "./types.js";

export {
  ACTIVITY_TYPES,
  PROGRESS_EXTENSION,
  StatementBuilder,
  VERBS,
  formatDuration,
  type StatementContextInfo,
} from "./statements.js";

export {
  StatementQueue,
  createDefaultQueueStorage,
  type QueueStorage,
  type StatementQueueConfig,
} from "./transport.js";

export {
  DEFAULT_STATE_ID,
  REGISTRATION_STATE_ID,
  STATE_SCHEMA_VERSION,
  StateClient,
  type StateClientConfig,
} from "./state.js";

export {
  createCompletionEngine,
  type CompletionCourseInfo,
  type CompletionEngine,
  type CompletionIntent,
} from "./completion.js";

export {
  createXapiTracker,
  nullTracker,
  type TrackingPort,
  type XapiTrackerOptions,
} from "./tracker.js";

export {
  goldenCourseInfo,
  goldenContextInfo,
  goldenLaunchContext,
  goldenPublishSettings,
  normalizeStatement,
  runGoldenPlaythrough,
} from "./golden.js";

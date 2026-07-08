// @forge/player public API (consumed by the editor preview and the published
// package shell). Runtime UI per docs/SPEC.md section 5 and RECOVERY-PLAN R1.

export { Player } from "./Player.js";
export type { PlayerProps } from "./Player.js";

// Tracking/resume prop shapes (type-only; no xapi runtime in this bundle).
// The standalone runtime entry (standalone.tsx) is a Vite build entry and is
// deliberately NOT exported here.
export type { PlayerResume, PlayerStateChange } from "./tracking.js";

export {
  buildCourseSnapshot,
  computeLessonPercent,
  consumesByInteraction,
  gatingIds,
  isContinueGate,
  visibleBlocks,
} from "./progress.js";
export type { CourseProgressSnapshot } from "./progress.js";

// U1 entrance mechanics (pure; PlayerBlock consumes these internally).
export {
  ENTRANCE_BASE_DELAY_S,
  ENTRANCE_DURATION_S,
  ENTRANCE_EASING,
  ENTRANCE_FALLBACK_MS,
  ENTRANCE_ROOT_MARGIN,
  ENTRANCE_STAGGER_S,
  entranceDelaySeconds,
  resolveEntranceKind,
} from "./entrance.js";
export type {
  BlockEntranceOverride,
  CourseEntranceSetting,
  EntranceKind,
} from "./entrance.js";

export { QuizLessonView } from "./quiz/QuizLessonView.js";
export type { QuizLessonViewProps } from "./quiz/QuizLessonView.js";

/** Preview viewport presets used by the editor's device toggle. */
export type PreviewDevice = "phone" | "tablet" | "desktop";

export const previewDeviceWidths: Record<PreviewDevice, number> = {
  phone: 390,
  tablet: 820,
  desktop: 1180,
};

export function getPreviewDeviceWidth(device: PreviewDevice): number {
  return previewDeviceWidths[device];
}

/** Course-theme typeface helpers (shared with the editor canvas so both
 * surfaces resolve the same curated stacks from a bare typeface name). */
export { fontStackOf, readableTextOn } from "./fonts.js";

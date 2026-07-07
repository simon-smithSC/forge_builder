// Standalone runtime entry for published xAPI packages (SPEC 7) and the
// `vite dev` shell. This file is a Vite build entry ONLY: it is never
// exported from index.ts. Unlike the Player component (type-only xapi
// imports), this bundle deliberately ships the @forge/xapi runtime.

import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { publishSettingsSchema, validateCourseDoc } from "@forge/schema";
import type {
  CourseDoc,
  PublishSettings,
  StateDocumentEnvelope,
} from "@forge/schema";
import {
  StateClient,
  createXapiTracker,
  nullTracker,
  parseLaunch,
} from "@forge/xapi";
import type { LaunchContext } from "@forge/xapi";
import { Player } from "./Player.js";
import { computeLessonPercent, gatingIds } from "./progress.js";
import type { PlayerResume, PlayerStateChange } from "./tracking.js";
import "@forge/blocks/styles.css";
import "./styles.css";

interface ForgeLaunchConfig {
  courseDataUrl?: string;
  buildId?: string;
  search?: string;
}

declare global {
  interface Window {
    __FORGE_LAUNCH__?: ForgeLaunchConfig;
  }
}

type StateBody = StateDocumentEnvelope["state"];

const EPOCH = "1970-01-01T00:00:00.000Z";

const DEFAULT_PUBLISH_SETTINGS: PublishSettings = {
  tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
  reportingMode: "passed-incomplete",
  exitCourseLink: false,
  hideCoverPage: false,
  strictLaunch: false,
  statementProfile: "forge-v1",
};

interface LoadedCourse {
  course: CourseDoc;
  settings: PublishSettings;
  activityId: string | undefined;
}

/**
 * The published course-data.json (compileCourse output) renames settings to
 * courseSettings, adds activityId/publishSettings, and drops timestamps.
 * Reverse that so validateCourseDoc accepts it; an unpublished editor-shape
 * document (dev shell) passes through unchanged.
 */
function reconstructCourseDoc(record: Record<string, unknown>): CourseDoc {
  const candidate: Record<string, unknown> = { ...record };
  delete candidate["activityId"];
  delete candidate["publishSettings"];
  delete candidate["courseSettings"];
  if (record["courseSettings"] !== undefined) {
    candidate["settings"] = record["courseSettings"];
  }
  if (candidate["createdAt"] === undefined) candidate["createdAt"] = EPOCH;
  if (candidate["updatedAt"] === undefined) candidate["updatedAt"] = EPOCH;
  return validateCourseDoc(candidate);
}

async function loadCourse(url: string): Promise<LoadedCourse> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Course data request failed with HTTP ${response.status}.`);
  }
  const raw: unknown = await response.json();
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Course data is not a JSON object.");
  }
  const record = raw as Record<string, unknown>;
  const parsedSettings = publishSettingsSchema.safeParse(record["publishSettings"]);
  return {
    course: reconstructCourseDoc(record),
    settings: parsedSettings.success ? parsedSettings.data : DEFAULT_PUBLISH_SETTINGS,
    activityId:
      typeof record["activityId"] === "string" ? record["activityId"] : undefined,
  };
}

function idsFromBitset(ids: readonly string[], bitset: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    if (id !== undefined && bitset[i] === "1") out.push(id);
  }
  return out;
}

/** State envelope -> PlayerResume (bitsets back to gating-id sets). */
function buildResume(course: CourseDoc, envelope: StateDocumentEnvelope): PlayerResume {
  const consumedByLesson: Record<string, string[]> = {};
  for (const lesson of course.lessons) {
    if (lesson.type === "section") continue;
    const stored = envelope.state.progress.lessons[lesson.id];
    if (stored === undefined) continue;
    const ids = gatingIds(lesson);
    // A republished course can change the gating id list; stale bitsets are
    // dropped rather than misapplied (blockCount must match, per schema).
    if (stored.blockCount !== ids.length) continue;
    const consumed = idsFromBitset(ids, stored.consumedBlockBitset);
    if (consumed.length > 0) consumedByLesson[lesson.id] = consumed;
  }
  const quizAttempts: Record<string, number> = {};
  for (const [lessonId, quiz] of Object.entries(envelope.state.quiz)) {
    if (quiz.attempts.length > 0) quizAttempts[lessonId] = quiz.attempts.length;
  }
  const resume: PlayerResume = {};
  const bookmark = envelope.state.bookmark?.lessonId;
  if (bookmark !== undefined) resume.lessonId = bookmark;
  if (Object.keys(consumedByLesson).length > 0) {
    resume.consumedByLesson = consumedByLesson;
  }
  if (Object.keys(quizAttempts).length > 0) resume.quizAttempts = quizAttempts;
  return resume;
}

/**
 * PlayerStateChange -> StateDocumentEnvelope body. Per-lesson progress is a
 * consumedBlockBitset string over the lesson's gating ids in course order;
 * the schema requires bitset length === blockCount, so both always come from
 * the same gatingIds() call. Quiz/interaction records read at launch are
 * carried forward untouched.
 */
function buildStateBody(
  course: CourseDoc,
  change: PlayerStateChange,
  carried: StateBody | null,
): StateBody {
  const lessons: StateBody["progress"]["lessons"] = {};
  for (const lesson of course.lessons) {
    if (lesson.type === "section") continue;
    const ids = gatingIds(lesson);
    const consumed = new Set(change.consumedByLesson[lesson.id] ?? []);
    const percent = computeLessonPercent(lesson, consumed);
    lessons[lesson.id] = {
      completed: percent === 100,
      percentComplete: percent,
      blockCount: ids.length,
      consumedBlockBitset: ids.map((id) => (consumed.has(id) ? "1" : "0")).join(""),
    };
  }
  return {
    bookmark: { lessonId: change.bookmarkLessonId },
    progress: { lessons },
    quiz: carried?.quiz ?? {},
    interactions: carried?.interactions ?? {},
  };
}

/** Package-relative passthrough: storageKeys are already assets/... paths. */
function makeMediaResolver(course: CourseDoc): (mediaId: string) => string | undefined {
  return (mediaId) => {
    const media = course.media[mediaId];
    if (media === undefined) return undefined;
    if (media.storageKey.startsWith("url:")) return media.storageKey.slice(4);
    return media.storageKey; // data: URLs and assets/* paths pass through.
  };
}

function exitCourse(): void {
  window.close();
  if (window.history.length > 1) window.history.back();
}

function fatalScreen(message: string): ReactElement {
  return (
    <div className="fp-standalone-error" role="alert">
      <h1>This course could not be started</h1>
      <p>{message}</p>
    </div>
  );
}

async function resolveTrackedContext(
  initial: LaunchContext,
  hadRegistrationParam: boolean,
  courseId: string,
): Promise<LaunchContext> {
  if (hadRegistrationParam) return initial;
  // Launch omitted registration: reuse the persisted one for this
  // (activity, agent) pair, or persist the freshly generated one (SPEC 13.2).
  const probe = new StateClient(initial, { courseId });
  const persisted = await probe.readPersistedRegistration().catch(() => null);
  if (persisted !== null) return { ...initial, registration: persisted };
  await probe.persistRegistration().catch(() => undefined);
  return initial;
}

async function boot(): Promise<void> {
  document.body.style.margin = "0";
  let container = document.getElementById("forge-root");
  if (container === null) {
    container = document.createElement("div");
    container.id = "forge-root";
    document.body.appendChild(container);
  }
  const root = createRoot(container);

  const config = window.__FORGE_LAUNCH__ ?? {};
  const courseDataUrl = config.courseDataUrl ?? "content/course-data.json";
  const search = config.search ?? window.location.search;

  try {
    const { course, settings, activityId } = await loadCourse(courseDataUrl);
    const resolveMediaUrl = makeMediaResolver(course);

    // strictLaunch makes parseLaunch throw (LaunchError) instead of falling
    // back to untracked preview mode.
    const launch = parseLaunch(search, {
      strict: settings.strictLaunch,
      ...(activityId !== undefined ? { fallbackActivityId: activityId } : {}),
    });

    if (launch.mode === "untracked") {
      // Field diagnostic: makes "no statements" debuggable from an LMS
      // launch console. The reason names the missing launch parameter.
      console.warn(
        `[forge-player] UNTRACKED mode: ${launch.reason}. ` +
          `No xAPI statements will be sent. Launch query seen: "${search || "(empty)"}"`,
      );
      root.render(
        <Player
          course={course}
          resolveMediaUrl={resolveMediaUrl}
          hideCover={settings.hideCoverPage}
          tracking={nullTracker}
          untrackedBanner
          {...(settings.exitCourseLink ? { onExit: exitCourse } : {})}
        />,
      );
      return;
    }

    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    const hadRegistrationParam = Boolean(params.get("registration")?.trim());
    const context = await resolveTrackedContext(
      launch.context,
      hadRegistrationParam,
      course.id,
    );

    console.info(
      `[forge-player] TRACKED mode. endpoint=${context.endpoint} ` +
        `activityId=${context.activityId} registration=${context.registration}`,
    );

    const stateClient = new StateClient(context, { courseId: course.id });
    const envelope = await stateClient.read().catch(() => null);
    const resume = envelope !== null ? buildResume(course, envelope) : undefined;
    const carried = envelope !== null ? envelope.state : null;

    const tracker = createXapiTracker(
      context,
      {
        courseId: course.id,
        courseVersion: course.schemaVersion,
        ...(config.buildId !== undefined ? { packageBuildId: config.buildId } : {}),
      },
      settings,
      {
        lessonIds: course.lessons
          .filter((lesson) => lesson.type !== "section")
          .map((lesson) => lesson.id),
      },
    );

    root.render(
      <Player
        course={course}
        resolveMediaUrl={resolveMediaUrl}
        hideCover={settings.hideCoverPage}
        tracking={tracker}
        {...(resume !== undefined ? { resume } : {})}
        onStateChange={(change) =>
          stateClient.write(buildStateBody(course, change, carried))
        }
        {...(settings.exitCourseLink ? { onExit: exitCourse } : {})}
      />,
    );
  } catch (error) {
    root.render(
      fatalScreen(error instanceof Error ? error.message : String(error)),
    );
  }
}

void boot();

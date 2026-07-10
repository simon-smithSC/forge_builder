// Course lifecycle: list, create, open (with journal recovery check), and
// close. Split from actions.ts to keep files focused.
import type { CourseDoc, Lesson } from "@forge/schema";
import {
  CURRENT_SCHEMA_VERSION,
  createUlid,
  defaultCourseSettings,
  defaultLabelSet,
  defaultTheme,
  migrateCourseDoc,
  validateCourseDoc,
} from "@forge/schema";
import { getRegistryEntry } from "@forge/blocks";
import { toast } from "@forge/ui";
import * as api from "../api/client.js";
import * as journal from "../journal/journal.js";
import * as history from "./history.js";
import {
  markCourseDirty,
  markLessonDirty,
  resetPersistence,
  scheduleSave,
} from "./persistence.js";
import { editorStore } from "./store.js";
import type { CourseSummary } from "./store.js";

const { getState, setState } = editorStore;

function toSummary(item: api.RevisionedCourse): CourseSummary {
  return {
    id: item.data.id,
    title: item.data.title,
    lessonCount: item.data.lessons.length,
    updatedAt: item.data.updatedAt,
    revision: item.revision,
  };
}

export async function loadCourseList(): Promise<void> {
  setState((prev) => ({ ...prev, busy: true, loadError: null }));
  try {
    const courses = await api.listCourses();
    setState((prev) => ({
      ...prev,
      busy: false,
      courseList: courses.map(toSummary),
    }));
  } catch (error) {
    setState((prev) => ({
      ...prev,
      busy: false,
      loadError: error instanceof Error ? error.message : "Failed to load courses.",
    }));
  }
}

function buildFreshCourse(): CourseDoc {
  const now = new Date().toISOString();
  const textEntry = getRegistryEntry("text");
  const firstVariant = textEntry.variants[0] ?? "paragraph";
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: createUlid(),
    title: "Untitled course",
    description: "",
    defaultLocale: "en",
    theme: { ...defaultTheme },
    labelSet: { ...defaultLabelSet },
    settings: {
      ...defaultCourseSettings,
      sidebar: { ...defaultCourseSettings.sidebar },
    },
    lessons: [
      {
        type: "blocks",
        id: createUlid(),
        title: "Lesson 1",
        blocks: [
          {
            id: createUlid(),
            family: "text",
            variant: firstVariant,
            payload: textEntry.createDefaultPayload(firstVariant),
            settings: { paddingTop: 2, paddingBottom: 2, textColorMode: "auto" },
          },
        ],
      },
    ],
    media: {},
    createdAt: now,
    updatedAt: now,
  } as CourseDoc;
}

export async function createNewCourse(): Promise<void> {
  setState((prev) => ({ ...prev, busy: true, loadError: null }));
  try {
    const draft = validateCourseDoc(buildFreshCourse());
    const result = await api.createCourse(draft);
    await enterCourse(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create course.";
    setState((prev) => ({ ...prev, busy: false, loadError: message }));
    // Action failure is transient feedback (5A.6); the list itself keeps its
    // inline role="alert" for load errors.
    toast(message, { tone: "danger", duration: 8000 });
  }
}

export async function openCourse(courseId: string): Promise<void> {
  setState((prev) => ({ ...prev, busy: true, loadError: null }));
  try {
    const result = await api.getCourse(courseId);
    await enterCourse(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open course.";
    setState((prev) => ({ ...prev, busy: false, loadError: message }));
    toast(message, { tone: "danger", duration: 8000 });
  }
}

async function enterCourse(result: api.RevisionedCourse): Promise<void> {
  resetPersistence();
  history.clearHistory();

  // EVERY course entering the store goes through migrateCourseDoc, not the
  // strict validator: the server stores raw JSON, so docs written by older
  // editors (e.g. timeline event `date` before the 1.3.0 rename to `label`)
  // would fail the strict parse and previously entered the store UNMIGRATED —
  // after which every payload commit failed validatePayload with
  // "Unrecognized key(s) in object: 'date'".
  let course: CourseDoc;
  let upgraded = false;
  try {
    course = migrateCourseDoc(result.data);
    const rawVersion = (result.data as { schemaVersion?: unknown }).schemaVersion;
    upgraded = rawVersion !== course.schemaVersion;
  } catch (error) {
    console.warn("Server course failed schema migration; editing as-is.", error);
    course = result.data;
  }

  // Journal recovery check: unacked entries written at or after the server
  // revision mean a save never landed (crash, offline close).
  const unacked = await journal.listUnacked(course.id);
  const pending = unacked.filter((entry) => entry.baseRevision >= result.revision);
  const restoreCandidate =
    pending.length > 0
      ? {
          lessonIds: [...new Set(pending.map((entry) => entry.lessonId))],
          entryCount: pending.length,
          newestAt: pending[pending.length - 1]?.at ?? "",
        }
      : null;

  setState((prev) => ({
    ...prev,
    busy: false,
    course,
    revision: result.revision,
    // Opening a course lands on the overview hub, not the lesson editor.
    screen: "overview",
    selectedLessonId: course.lessons[0]?.id ?? null,
    selectedBlockId: null,
    settingsOpen: false,
    saveStatus: "saved",
    restoreCandidate,
    mediaUrls: {},
    lessonLocks: {},
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }));

  // A migrated doc differs from the stored copy: schedule a save so the
  // server is rewritten in the current shape and the migration never
  // needs to run again for this course.
  if (upgraded) {
    markCourseDirty();
    scheduleSave();
  }
}

/** Apply journaled lesson objects onto the fetched doc, newest last. */
export async function restoreFromJournal(): Promise<void> {
  const state = getState();
  const course = state.course;
  if (!course) return;
  const unacked = await journal.listUnacked(course.id);
  const pending = unacked.filter((entry) => entry.baseRevision >= state.revision);
  if (pending.length === 0) {
    setState((prev) => ({ ...prev, restoreCandidate: null }));
    return;
  }
  const latestByLesson = new Map<string, Lesson>();
  for (const entry of pending) latestByLesson.set(entry.lessonId, entry.lesson);

  let next = course;
  for (const [lessonId, lesson] of latestByLesson) {
    const exists = next.lessons.some((item) => item.id === lessonId);
    next = {
      ...next,
      lessons: exists
        ? next.lessons.map((item) => (item.id === lessonId ? lesson : item))
        : [...next.lessons, lesson],
    };
    markLessonDirty(lessonId);
  }
  history.pushSnapshot(course);
  setState((prev) => ({
    ...prev,
    course: next,
    restoreCandidate: null,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }));
  scheduleSave();
}

export async function dismissRestore(): Promise<void> {
  const state = getState();
  setState((prev) => ({ ...prev, restoreCandidate: null }));
  if (state.course) {
    await journal.ackEntries(state.course.id, new Date().toISOString());
  }
}

export function closeCourse(): void {
  const state = getState();
  for (const url of Object.values(state.mediaUrls)) URL.revokeObjectURL(url);
  resetPersistence();
  history.clearHistory();
  setState((prev) => ({
    ...prev,
    course: null,
    screen: "overview",
    selectedLessonId: null,
    selectedBlockId: null,
    settingsOpen: false,
    saveStatus: "saved",
    revision: 1,
    mediaUrls: {},
    lessonLocks: {},
    restoreCandidate: null,
    canUndo: false,
    canRedo: false,
  }));
  void loadCourseList();
}

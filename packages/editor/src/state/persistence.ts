// Persistence wiring per SPEC 4.5: debounced autosave through services/api
// with revision discipline, an IndexedDB write-ahead journal, offline retry,
// and 409 conflict surfacing. NO localStorage for course data (ADR 0003).
import type { CourseDoc } from "@forge/schema";
import { migrateCourseDoc } from "@forge/schema";
import {
  ApiConflictError,
  ApiNetworkError,
  getCourse,
  patchCourse,
  putLesson,
} from "../api/client.js";
import * as journal from "../journal/journal.js";
import { editorStore } from "./store.js";
import type { SaveStatus } from "./store.js";

const DEBOUNCE_MS = 2000;
const RETRY_MS = 15000;

let dirtyLessonIds = new Set<string>();
let courseDirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;

function setSaveStatus(saveStatus: SaveStatus): void {
  editorStore.setState((prev) =>
    prev.saveStatus === saveStatus ? prev : { ...prev, saveStatus },
  );
}

export function markLessonDirty(lessonId: string): void {
  dirtyLessonIds.add(lessonId);
}

/** Course-level changes (title, settings, lesson add/remove/reorder). */
export function markCourseDirty(): void {
  courseDirty = true;
}

export function hasPendingChanges(): boolean {
  return courseDirty || dirtyLessonIds.size > 0 || saving;
}

/** Debounce 2s after the last change, then flush. */
export function scheduleSave(): void {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushNow();
  }, DEBOUNCE_MS);
}

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushNow();
  }, RETRY_MS);
}

/** Reset all pending state; called on course open/close. */
export function resetPersistence(): void {
  dirtyLessonIds = new Set<string>();
  courseDirty = false;
  saving = false;
  if (saveTimer !== null) clearTimeout(saveTimer);
  if (retryTimer !== null) clearTimeout(retryTimer);
  saveTimer = null;
  retryTimer = null;
}

function courseToPatchData(course: CourseDoc): Record<string, unknown> {
  // PATCH merges top-level keys; sending the full doc keeps it simple in R1.
  return { ...course } as unknown as Record<string, unknown>;
}

export async function flushNow(): Promise<void> {
  const state = editorStore.getState();
  const course = state.course;
  if (!course) return;
  if (saving) {
    scheduleSave();
    return;
  }
  if (!courseDirty && dirtyLessonIds.size === 0) return;

  // Snapshot what this flush covers; edits during the await re-dirty.
  const lessonIds = [...dirtyLessonIds];
  const wasCourseDirty = courseDirty;
  dirtyLessonIds = new Set<string>();
  courseDirty = false;
  saving = true;
  setSaveStatus("saving");

  const at = new Date().toISOString();
  try {
    let revision = state.revision;

    // Write-ahead: journal every dirty lesson BEFORE the save attempt.
    for (const lessonId of lessonIds) {
      const lesson = course.lessons.find((item) => item.id === lessonId);
      if (!lesson) continue;
      await journal.appendEntry({
        courseId: course.id,
        lessonId,
        lesson,
        baseRevision: revision,
        at,
      });
    }

    if (wasCourseDirty) {
      const result = await patchCourse(course.id, revision, courseToPatchData(course));
      revision = result.revision;
    } else {
      for (const lessonId of lessonIds) {
        const lesson = course.lessons.find((item) => item.id === lessonId);
        if (!lesson) continue;
        const result = await putLesson(course.id, lessonId, lesson, revision);
        revision = result.revision;
      }
    }

    await journal.ackEntries(course.id, at);
    editorStore.setState((prev) => ({ ...prev, revision, saveStatus: "saved" }));
  } catch (error) {
    // Failed work goes back on the dirty pile; journal entries stay unacked.
    for (const lessonId of lessonIds) dirtyLessonIds.add(lessonId);
    if (wasCourseDirty) courseDirty = true;
    if (error instanceof ApiConflictError) {
      setSaveStatus("conflict");
    } else if (error instanceof ApiNetworkError) {
      setSaveStatus("offline");
      scheduleRetry();
    } else {
      console.error("Save failed", error);
      setSaveStatus("offline");
      scheduleRetry();
    }
  } finally {
    saving = false;
    if (
      (courseDirty || dirtyLessonIds.size > 0) &&
      editorStore.getState().saveStatus === "saved"
    ) {
      scheduleSave();
    }
  }
}

/** Conflict resolution: discard local changes and take the server copy. */
export async function reloadServerCopy(): Promise<void> {
  const state = editorStore.getState();
  if (!state.course) return;
  const courseId = state.course.id;
  resetPersistence();
  const result = await getCourse(courseId);
  await journal.ackEntries(courseId, new Date().toISOString());
  // Same contract as courseLifecycle.enterCourse: every doc entering the
  // store passes through migrateCourseDoc (the server stores raw JSON).
  let course: CourseDoc;
  try {
    course = migrateCourseDoc(result.data);
  } catch (error) {
    console.warn("Server course failed schema migration; editing as-is.", error);
    course = result.data;
  }
  editorStore.setState((prev) => ({
    ...prev,
    course,
    revision: result.revision,
    saveStatus: "saved",
    selectedBlockId: null,
    settingsOpen: false,
  }));
}

/** Conflict resolution: overwrite the server with the local draft, using the
 * current server revision so the PATCH is accepted. */
export async function overwriteServerCopy(): Promise<void> {
  const state = editorStore.getState();
  const course = state.course;
  if (!course) return;
  setSaveStatus("saving");
  try {
    const server = await getCourse(course.id);
    const result = await patchCourse(
      course.id,
      server.revision,
      courseToPatchData(course),
    );
    await journal.ackEntries(course.id, new Date().toISOString());
    dirtyLessonIds = new Set<string>();
    courseDirty = false;
    editorStore.setState((prev) => ({
      ...prev,
      revision: result.revision,
      saveStatus: "saved",
    }));
  } catch (error) {
    if (error instanceof ApiConflictError) setSaveStatus("conflict");
    else setSaveStatus("offline");
  }
}

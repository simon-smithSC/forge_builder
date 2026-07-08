// UI-facing actions: apply pure mutations, maintain undo history, mark dirty
// state, and schedule persistence. Course open/create/close lives in
// courseLifecycle.ts and is re-exported here for the UI.
import type {
  BlockFamily,
  BlockSettings,
  CourseDoc,
  Lesson,
  MediaRef,
} from "@forge/schema";
import { createUlid } from "@forge/schema";
import * as history from "./history.js";
import * as mutations from "./mutations.js";
import {
  markCourseDirty,
  markLessonDirty,
  scheduleSave,
} from "./persistence.js";
import { shouldAutoOpenSettings } from "./settingsPolicy.js";
import { editorStore } from "./store.js";
import { storeTheme } from "../ui/uiPrefs.js";
import type { UiTheme } from "../ui/uiPrefs.js";

export {
  closeCourse,
  createNewCourse,
  dismissRestore,
  loadCourseList,
  openCourse,
  restoreFromJournal,
} from "./courseLifecycle.js";

const { getState, setState } = editorStore;

function historyFlags() {
  return { canUndo: history.canUndo(), canRedo: history.canRedo() };
}

function applyLessonMutation(
  lessonId: string,
  fn: (course: CourseDoc) => CourseDoc,
): void {
  const state = getState();
  if (!state.course) return;
  const next = fn(state.course);
  if (next === state.course) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({ ...prev, course: next, ...historyFlags() }));
  markLessonDirty(lessonId);
  scheduleSave();
}

function applyCourseMutation(fn: (course: CourseDoc) => CourseDoc): void {
  const state = getState();
  if (!state.course) return;
  const next = fn(state.course);
  if (next === state.course) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({ ...prev, course: next, ...historyFlags() }));
  markCourseDirty();
  scheduleSave();
}

// ---- selection ----

export function selectLesson(lessonId: string | null): void {
  setState((prev) => ({
    ...prev,
    selectedLessonId: lessonId,
    selectedBlockId: null,
    settingsOpen: false,
  }));
}

/** Selection only: never opens the settings tray. Deselecting (null) also
 * closes it so clicking empty canvas dismisses the tray (V1.1). */
export function selectBlock(blockId: string | null): void {
  setState((prev) => ({
    ...prev,
    selectedBlockId: blockId,
    settingsOpen: blockId === null ? false : prev.settingsOpen,
  }));
}

/** Select a block AND open the settings tray (the rail's Edit settings
 * button, plus config-heavy inserts via shouldAutoOpenSettings). */
export function openBlockSettings(blockId: string): void {
  setState((prev) => ({
    ...prev,
    selectedBlockId: blockId,
    settingsOpen: true,
  }));
}

/** Close the tray but KEEP the selection (tray X button, Escape). */
export function closeBlockSettings(): void {
  setState((prev) => ({ ...prev, settingsOpen: false }));
}

// ---- screen navigation (course overview <-> lesson editor) ----

/** Select a lesson and enter the three-region lesson editor. */
export function openLessonEditor(lessonId: string): void {
  setState((prev) => ({
    ...prev,
    screen: "lesson",
    selectedLessonId: lessonId,
    selectedBlockId: null,
    settingsOpen: false,
  }));
}

/** Return from the lesson editor to the course overview hub. */
export function showCourseOverview(): void {
  setState((prev) => ({
    ...prev,
    screen: "overview",
    selectedBlockId: null,
    settingsOpen: false,
  }));
}

// ---- UI theme (D6 dark mode) ----

/** Flip the tool-chrome theme and persist the explicit choice. */
export function toggleUiTheme(): void {
  const next: UiTheme = getState().uiTheme === "dark" ? "light" : "dark";
  setState((prev) => ({ ...prev, uiTheme: next }));
  storeTheme(next);
}

/** Follow-the-OS updates (App's matchMedia listener): no persistence. */
export function setUiTheme(theme: UiTheme): void {
  setState((prev) => ({ ...prev, uiTheme: theme }));
}

// ---- undo/redo ----

export function undo(): void {
  const state = getState();
  if (!state.course) return;
  const previous = history.undo(state.course);
  if (!previous) return;
  setState((prev) => ({ ...prev, course: previous, ...historyFlags() }));
  markCourseDirty();
  scheduleSave();
}

export function redo(): void {
  const state = getState();
  if (!state.course) return;
  const next = history.redo(state.course);
  if (!next) return;
  setState((prev) => ({ ...prev, course: next, ...historyFlags() }));
  markCourseDirty();
  scheduleSave();
}

// ---- block mutations ----

export function setBlockPayload(
  lessonId: string,
  blockId: string,
  payload: unknown,
): void {
  applyLessonMutation(lessonId, (course) =>
    mutations.updateBlockPayload(course, lessonId, blockId, payload),
  );
}

export function setBlockSettings(
  lessonId: string,
  blockId: string,
  settings: Partial<BlockSettings>,
): void {
  applyLessonMutation(lessonId, (course) =>
    mutations.updateBlockSettings(course, lessonId, blockId, settings),
  );
}

export function setBlockVariant(
  lessonId: string,
  blockId: string,
  variant: string,
): void {
  applyLessonMutation(lessonId, (course) =>
    mutations.updateBlockVariant(course, lessonId, blockId, variant),
  );
}

export function insertBlock(
  lessonId: string,
  family: BlockFamily,
  index: number,
): void {
  const state = getState();
  if (!state.course) return;
  const { course, blockId } = mutations.addBlock(
    state.course,
    lessonId,
    family,
    index,
  );
  if (course === state.course) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({
    ...prev,
    course,
    selectedBlockId: blockId,
    // Config-heavy families open their settings on INSERT; text-like
    // families are edited inline and only get selected (settingsPolicy.ts).
    settingsOpen: shouldAutoOpenSettings(family),
    ...historyFlags(),
  }));
  markLessonDirty(lessonId);
  scheduleSave();
}

export function deleteBlock(lessonId: string, blockId: string): void {
  applyLessonMutation(lessonId, (course) =>
    mutations.removeBlock(course, lessonId, blockId),
  );
  setState((prev) =>
    prev.selectedBlockId === blockId
      ? { ...prev, selectedBlockId: null, settingsOpen: false }
      : prev,
  );
}

export function moveBlock(
  lessonId: string,
  blockId: string,
  direction: "up" | "down",
): void {
  applyLessonMutation(lessonId, (course) =>
    mutations.moveBlock(course, lessonId, blockId, direction),
  );
}

export function duplicateBlock(lessonId: string, blockId: string): void {
  const state = getState();
  if (!state.course) return;
  const { course, blockId: newId } = mutations.duplicateBlock(
    state.course,
    lessonId,
    blockId,
  );
  if (course === state.course || !newId) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({
    ...prev,
    course,
    selectedBlockId: newId,
    ...historyFlags(),
  }));
  markLessonDirty(lessonId);
  scheduleSave();
}

// ---- lesson mutations (course-level: go through PATCH) ----

export function addLesson(type: Lesson["type"]): void {
  const state = getState();
  if (!state.course) return;
  const { course, lessonId } = mutations.addLesson(state.course, type);
  history.pushSnapshot(state.course);
  setState((prev) => ({
    ...prev,
    course,
    selectedLessonId: lessonId,
    selectedBlockId: null,
    ...historyFlags(),
  }));
  markCourseDirty();
  scheduleSave();
}

export function renameLesson(lessonId: string, title: string): void {
  applyCourseMutation((course) => mutations.renameLesson(course, lessonId, title));
}

export function setSectionDescription(lessonId: string, description: string): void {
  applyCourseMutation((course) =>
    mutations.updateSectionDescription(course, lessonId, description),
  );
}

export function removeLesson(lessonId: string): void {
  applyCourseMutation((course) => mutations.removeLesson(course, lessonId));
  setState((prev) =>
    prev.selectedLessonId === lessonId
      ? {
          ...prev,
          selectedLessonId: prev.course?.lessons[0]?.id ?? null,
          selectedBlockId: null,
        }
      : prev,
  );
}

export function moveLesson(lessonId: string, direction: "up" | "down"): void {
  applyCourseMutation((course) => mutations.moveLesson(course, lessonId, direction));
}

export function setCourseMeta(meta: {
  title?: string;
  description?: string;
  author?: string;
}): void {
  applyCourseMutation((course) => mutations.updateCourseMeta(course, meta));
}

// ---- media (R1 bridge: object URLs + local storage keys) ----
// R2: signed-URL upload flow + media picker dialog.

function mediaKindOf(mime: string): MediaRef["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "text/vtt") return "captions";
  return "attachment";
}

export function importMediaFile(file: File): string {
  const mediaId = createUlid();
  const ref: MediaRef = {
    id: mediaId,
    kind: mediaKindOf(file.type),
    filename: file.name,
    mime: file.type || "application/octet-stream",
    bytes: file.size,
    storageKey: `local:${mediaId}`,
  };
  const objectUrl = URL.createObjectURL(file);
  applyCourseMutation((course) => mutations.addMediaRef(course, ref));
  setState((prev) => ({
    ...prev,
    mediaUrls: { ...prev.mediaUrls, [mediaId]: objectUrl },
  }));
  return mediaId;
}

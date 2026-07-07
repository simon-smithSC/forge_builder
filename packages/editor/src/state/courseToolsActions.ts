// Course-level tool actions (R2): theme, label set, and media registration
// used by the dialogs in ui/dialogs/. Kept separate from actions.ts per the
// R2 file-ownership contract; mirrors its course-meta update path (snapshot,
// setState, markCourseDirty, scheduleSave).
import type { CourseDoc, LabelSet, MediaRef, Theme } from "@forge/schema";
import * as history from "./history.js";
import { addMediaRef } from "./mutations.js";
import { markCourseDirty, scheduleSave } from "./persistence.js";
import { editorStore } from "./store.js";

const { getState, setState } = editorStore;

function applyCourseMutation(fn: (course: CourseDoc) => CourseDoc): void {
  const state = getState();
  if (!state.course) return;
  const next = fn(state.course);
  if (next === state.course) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({
    ...prev,
    course: next,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }));
  markCourseDirty();
  scheduleSave();
}

function touch(course: CourseDoc): CourseDoc {
  return { ...course, updatedAt: new Date().toISOString() };
}

/** Replace course.theme. Canvas re-derives --forge-* CSS vars from it. */
export function setTheme(theme: Theme): void {
  applyCourseMutation((course) => touch({ ...course, theme }));
}

/** Replace course.labelSet. Callers must carry the translations key over. */
export function setLabelSet(labelSet: LabelSet): void {
  applyCourseMutation((course) => touch({ ...course, labelSet }));
}

/**
 * Register a MediaRef plus its resolvable URL (object URL for local files,
 * the remote URL itself for url: storage keys) through the same path as the
 * R1 media bridge in actions.ts: course.media via addMediaRef and the store
 * mediaUrls map. // R2.5: signed-URL upload to services/api replaces this.
 */
export function registerMedia(ref: MediaRef, url: string): void {
  applyCourseMutation((course) => addMediaRef(course, ref));
  setState((prev) => ({
    ...prev,
    mediaUrls: { ...prev.mediaUrls, [ref.id]: url },
  }));
}

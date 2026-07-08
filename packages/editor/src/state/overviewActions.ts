// Course-overview creation action (P6). addLesson() in actions.ts always
// appends with a default title; the overview's inline creation inputs need
// "create with this title at this position" as ONE undo step, so the
// composition lives here following the actions.ts/dndActions.ts conventions:
// pure mutations produce a new CourseDoc, then one snapshot + dirty + save.
import type { CourseDoc, Lesson } from "@forge/schema";
import * as history from "./history.js";
import * as mutations from "./mutations.js";
import { markCourseDirty, scheduleSave } from "./persistence.js";
import { editorStore } from "./store.js";

const { getState, setState } = editorStore;

/** Move the last lesson (the one addLesson just appended) to `index`. */
function placeLastLessonAt(course: CourseDoc, index: number): CourseDoc {
  const lessons = [...course.lessons];
  const created = lessons.pop();
  if (!created) return course;
  const at = Math.max(0, Math.min(index, lessons.length));
  lessons.splice(at, 0, created);
  return { ...course, lessons };
}

/**
 * Create a lesson/section/quiz with an optional typed title at a specific
 * outline index (`null` appends at the end). Returns the new lesson id.
 */
export function createLessonAt(
  type: Lesson["type"],
  title: string,
  index: number | null,
): string | null {
  const state = getState();
  if (!state.course) return null;

  const added = mutations.addLesson(state.course, type);
  let next = added.course;
  const trimmed = title.trim();
  if (trimmed.length > 0) {
    next = mutations.renameLesson(next, added.lessonId, trimmed);
  }
  if (index !== null && index < next.lessons.length - 1) {
    next = placeLastLessonAt(next, index);
  }

  history.pushSnapshot(state.course);
  setState((prev) => ({
    ...prev,
    course: next,
    selectedLessonId: added.lessonId,
    selectedBlockId: null,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }));
  markCourseDirty();
  scheduleSave();
  return added.lessonId;
}

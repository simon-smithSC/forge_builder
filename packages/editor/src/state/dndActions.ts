// Drag-and-drop reorder actions (dnd-kit onDragEnd handlers). Follows the
// exact conventions of actions.ts: a pure mutation produces a NEW CourseDoc
// with structural sharing, then we push an undo snapshot, mark dirty state,
// and schedule persistence. Lives in its own module so actions.ts and
// mutations.ts stay untouched (parallel-agent file ownership).
import type { Block, CourseDoc } from "@forge/schema";
import * as history from "./history.js";
import {
  markCourseDirty,
  markLessonDirty,
  scheduleSave,
} from "./persistence.js";
import { editorStore } from "./store.js";

const { getState, setState } = editorStore;

function historyFlags() {
  return { canUndo: history.canUndo(), canRedo: history.canRedo() };
}

function touch(course: CourseDoc): CourseDoc {
  return { ...course, updatedAt: new Date().toISOString() };
}

/** arrayMove semantics: remove the item at `from`, re-insert it at `to`.
 * Returns null when the move is out of range or a no-op. */
function arrayMove<T>(items: readonly T[], from: number, to: number): T[] | null {
  if (from === to) return null;
  if (from < 0 || from >= items.length) return null;
  if (to < 0 || to >= items.length) return null;
  const moved = items[from];
  if (moved === undefined) return null;
  const next = items.filter((_, index) => index !== from);
  next.splice(to, 0, moved);
  return next;
}

// ---- pure mutations (new CourseDoc, structural sharing) ----

function reorderBlockPure(
  course: CourseDoc,
  lessonId: string,
  fromIndex: number,
  toIndex: number,
): CourseDoc {
  let changed = false;
  const lessons = course.lessons.map((lesson) => {
    if (lesson.id !== lessonId || lesson.type !== "blocks") return lesson;
    const blocks = arrayMove<Block>(lesson.blocks, fromIndex, toIndex);
    if (!blocks) return lesson;
    changed = true;
    return { ...lesson, blocks };
  });
  if (!changed) return course;
  return touch({ ...course, lessons });
}

function reorderLessonPure(
  course: CourseDoc,
  fromIndex: number,
  toIndex: number,
): CourseDoc {
  const lessons = arrayMove(course.lessons, fromIndex, toIndex);
  if (!lessons) return course;
  return touch({ ...course, lessons });
}

// ---- UI-facing actions ----

/** Move a block within a blocks lesson from one index to another (drag drop). */
export function reorderBlock(
  lessonId: string,
  fromIndex: number,
  toIndex: number,
): void {
  const state = getState();
  if (!state.course) return;
  const next = reorderBlockPure(state.course, lessonId, fromIndex, toIndex);
  if (next === state.course) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({ ...prev, course: next, ...historyFlags() }));
  markLessonDirty(lessonId);
  scheduleSave();
}

/** Move a lesson (or section header) within the course outline (drag drop). */
export function reorderLesson(fromIndex: number, toIndex: number): void {
  const state = getState();
  if (!state.course) return;
  const next = reorderLessonPure(state.course, fromIndex, toIndex);
  if (next === state.course) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({ ...prev, course: next, ...historyFlags() }));
  markCourseDirty();
  scheduleSave();
}

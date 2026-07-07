// Variant-aware block insertion for the P4 quick-add strip and block
// library. mutations.addBlock always inserts a family's FIRST variant, so
// this module adds the variant-specific path. Follows the exact conventions
// of actions.ts/dndActions.ts: a pure mutation produces a NEW CourseDoc with
// structural sharing, then we push an undo snapshot, mark dirty state, and
// schedule persistence. Lives in its own module so actions.ts and
// mutations.ts stay untouched (parallel-agent file ownership).
import type { Block, BlockFamily, BlockSettings, CourseDoc } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { getRegistryEntry } from "@forge/blocks";
import * as history from "./history.js";
import { markLessonDirty, scheduleSave } from "./persistence.js";
import { editorStore } from "./store.js";

const { getState, setState } = editorStore;

// Mirrors DEFAULT_BLOCK_SETTINGS in mutations.ts (not exported there).
const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  paddingTop: 2,
  paddingBottom: 2,
  textColorMode: "auto",
};

function historyFlags() {
  return { canUndo: history.canUndo(), canRedo: history.canRedo() };
}

function touch(course: CourseDoc): CourseDoc {
  return { ...course, updatedAt: new Date().toISOString() };
}

// ---- pure mutation (new CourseDoc, structural sharing) ----

function insertBlockVariantPure(
  course: CourseDoc,
  lessonId: string,
  family: BlockFamily,
  variant: string,
  index: number,
): { course: CourseDoc; blockId: string | null } {
  const entry = getRegistryEntry(family);
  if (!entry.variants.includes(variant)) {
    throw new Error(`Family "${family}" has no variant "${variant}".`);
  }
  const blockId = createUlid();
  const block = {
    id: blockId,
    family,
    variant,
    payload: entry.createDefaultPayload(variant),
    settings: { ...DEFAULT_BLOCK_SETTINGS },
  } as Block;
  let changed = false;
  const lessons = course.lessons.map((lesson) => {
    if (lesson.id !== lessonId || lesson.type !== "blocks") return lesson;
    const at = Math.max(0, Math.min(index, lesson.blocks.length));
    changed = true;
    return {
      ...lesson,
      blocks: [...lesson.blocks.slice(0, at), block, ...lesson.blocks.slice(at)],
    };
  });
  if (!changed) return { course, blockId: null };
  return { course: touch({ ...course, lessons }), blockId };
}

// ---- UI-facing action ----

/** Insert a block of a SPECIFIC family+variant at `index` and select it. */
export function insertBlockVariant(
  lessonId: string,
  family: BlockFamily,
  variant: string,
  index: number,
): void {
  const state = getState();
  if (!state.course) return;
  const { course, blockId } = insertBlockVariantPure(
    state.course,
    lessonId,
    family,
    variant,
    index,
  );
  if (course === state.course || !blockId) return;
  history.pushSnapshot(state.course);
  setState((prev) => ({
    ...prev,
    course,
    selectedBlockId: blockId,
    ...historyFlags(),
  }));
  markLessonDirty(lessonId);
  scheduleSave();
}

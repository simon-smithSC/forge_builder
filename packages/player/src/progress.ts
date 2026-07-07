import type { Block, Lesson } from "@forge/schema";

/**
 * Progress snapshot the host (editor preview, published shell, xapi layer)
 * receives after every consumption change. Keys are lesson ids; section
 * headers are excluded (they carry no completable content).
 */
export interface CourseProgressSnapshot {
  percent: number;
  lessons: Record<
    string,
    { completed: boolean; percentComplete: number; consumedBlockIds: string[] }
  >;
}

/** Families whose blocks are consumed via events.onCompleted (SPEC section 5). */
const interactionGatedFamilies: ReadonlySet<string> = new Set([
  "interactive",
  "interactive-fullscreen",
  "flashcard",
  "knowledgeCheck",
  "scenario",
  "checklist",
]);

/**
 * True when the block consumes through interaction (events.onCompleted);
 * false when it consumes by scrolling into view. Continue-button dividers are
 * the only interactive divider variant.
 */
export function consumesByInteraction(block: Block): boolean {
  if (block.family === "divider") return block.variant === "continue button";
  return interactionGatedFamilies.has(block.family);
}

/** True for the one block variant that gates progressive reveal (U2). */
export function isContinueGate(block: Block): boolean {
  return block.family === "divider" && block.variant === "continue button";
}

/**
 * Progressive reveal (docs/PLAYER-UX-PLAN.md U2, Rise parity): the player
 * renders only the prefix of blocks up to and including the FIRST continue
 * divider whose id is not in the consumed set; blocks after it do not mount.
 * Multiple gates chain naturally: consuming gate 1 exposes content up to
 * gate 2, and so on. Non-continue dividers never gate. Percent math is
 * untouched: hidden blocks stay unconsumed, so completion still requires
 * revealing (and consuming) everything.
 */
export function visibleBlocks(
  lesson: Lesson,
  consumed: ReadonlySet<string>,
): Block[] {
  if (lesson.type !== "blocks") return [];
  const shown: Block[] = [];
  for (const block of lesson.blocks) {
    shown.push(block);
    if (isContinueGate(block) && !consumed.has(block.id)) break;
  }
  return shown;
}

/**
 * Ids that gate completion for a lesson: every block of a blocks lesson,
 * every question of a quiz lesson (answered questions are recorded in the
 * same consumed set), nothing for section headers.
 */
export function gatingIds(lesson: Lesson): string[] {
  if (lesson.type === "blocks") return lesson.blocks.map((block) => block.id);
  if (lesson.type === "quiz") return lesson.questions.map((question) => question.id);
  return [];
}

/**
 * Percent complete for one lesson given the set of consumed ids.
 * Sections are always 100. Quiz lessons are 0 or 100 (R1: complete when all
 * questions are answered). Blocks lessons: consumed gating blocks / gating blocks.
 */
export function computeLessonPercent(
  lesson: Lesson,
  consumed: ReadonlySet<string>,
): number {
  if (lesson.type === "section") return 100;
  if (lesson.type === "quiz") {
    return lesson.questions.every((question) => consumed.has(question.id)) ? 100 : 0;
  }
  const ids = gatingIds(lesson);
  if (ids.length === 0) return 100;
  const done = ids.reduce((count, id) => count + (consumed.has(id) ? 1 : 0), 0);
  return Math.round((done / ids.length) * 100);
}

const EMPTY: ReadonlySet<string> = new Set<string>();

/** Builds the full snapshot handed to PlayerProps.onProgress. */
export function buildCourseSnapshot(
  lessons: readonly Lesson[],
  consumedByLesson: Readonly<Record<string, ReadonlySet<string>>>,
): CourseProgressSnapshot {
  const lessonSnapshots: CourseProgressSnapshot["lessons"] = {};
  let counted = 0;
  let percentSum = 0;
  for (const lesson of lessons) {
    if (lesson.type === "section") continue;
    const consumed = consumedByLesson[lesson.id] ?? EMPTY;
    const percentComplete = computeLessonPercent(lesson, consumed);
    lessonSnapshots[lesson.id] = {
      completed: percentComplete === 100,
      percentComplete,
      consumedBlockIds: [...consumed],
    };
    counted += 1;
    percentSum += percentComplete;
  }
  return {
    percent: counted === 0 ? 0 : Math.round(percentSum / counted),
    lessons: lessonSnapshots,
  };
}

// Undo/redo as an Immer-backed snapshot stack of CourseDoc. produce() records
// each snapshot with structural sharing, so unchanged subtrees are shared
// between stack entries instead of copied. Cap 100, cleared on course switch.
// Patch-based journaling (produceWithPatches feeding the write-ahead journal)
// is queued for R3.
import { produce, setAutoFreeze } from "immer";
import type { CourseDoc } from "@forge/schema";

// Mutation helpers and payload editors write into docs handed back from
// undo/redo, so snapshots returned from produce must stay mutable.
setAutoFreeze(false);

const CAP = 100;

const undoStack: CourseDoc[] = [];
const redoStack: CourseDoc[] = [];

/** Identity produce: registers the doc as an Immer snapshot with full
 * structural sharing (no deep copy). */
function snapshot(doc: CourseDoc): CourseDoc {
  return produce(doc, () => {});
}

export function pushSnapshot(doc: CourseDoc): void {
  undoStack.push(snapshot(doc));
  if (undoStack.length > CAP) undoStack.shift();
  redoStack.length = 0;
}

export function undo(current: CourseDoc): CourseDoc | undefined {
  const previous = undoStack.pop();
  if (previous) redoStack.push(snapshot(current));
  return previous;
}

export function redo(current: CourseDoc): CourseDoc | undefined {
  const next = redoStack.pop();
  if (next) undoStack.push(snapshot(current));
  return next;
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

export function clearHistory(): void {
  undoStack.length = 0;
  redoStack.length = 0;
}

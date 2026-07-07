// U2 continue-reveal hooks (player-internal, docs/PLAYER-UX-PLAN.md section
// 3): scroll + live-region announcement when a consumed gate mounts a new
// batch, and Rise --idx stagger bookkeeping (indexes reset per batch).

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface ContinueRevealInput {
  started: boolean;
  lessonId: string | undefined;
  /** Newline-joined rendered block ids (stable identity for the visible set). */
  shownIdsKey: string;
  prefersReducedMotion: boolean;
  /** The scrolling <main> element that contains [data-block-id] nodes. */
  mainRef: RefObject<HTMLElement | null>;
}

/**
 * Watches the rendered block set; when it grows within the same lesson (a
 * continue divider was consumed), smooth-scrolls to the first newly mounted
 * block (behavior "auto" under reduced motion) and returns "Continued" for a
 * polite live region, cleared shortly after so repeat gates re-announce.
 * The reveal itself animates through PlayerBlock (U1): new blocks mount with
 * fresh stagger indexes, so the reveal IS the entrance transition.
 */
export function useContinueReveal(input: ContinueRevealInput): string {
  const { started, lessonId, shownIdsKey, prefersReducedMotion, mainRef } =
    input;
  const [announcement, setAnnouncement] = useState("");
  const prevRef = useRef<{ lessonId: string | undefined; count: number }>({
    lessonId: undefined,
    count: 0,
  });
  useEffect(() => {
    const prev = prevRef.current;
    const ids = shownIdsKey === "" ? [] : shownIdsKey.split("\n");
    prevRef.current = { lessonId, count: ids.length };
    if (!started || lessonId === undefined) return;
    if (prev.lessonId !== lessonId) return; // lesson change, not a reveal
    if (ids.length <= prev.count) return;
    const firstNewId = ids[prev.count];
    if (firstNewId === undefined) return;
    const el = mainRef.current?.querySelector(
      `[data-block-id="${firstNewId}"]`,
    );
    el?.scrollIntoView?.({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    setAnnouncement("Continued");
    const timer = setTimeout(() => setAnnouncement(""), 1500);
    return () => clearTimeout(timer);
  }, [started, lessonId, shownIdsKey, prefersReducedMotion, mainRef]);
  return announcement;
}

/**
 * Stagger indexes with Rise batch semantics: a block keeps the index it was
 * assigned when it first rendered; every newly revealing batch restarts at 0
 * (initial mount is batch one: 0..n-1 in DOM order). Call the returned
 * function in render order for each visible block. Resets on lesson change.
 */
export function useBatchStagger(
  lessonId: string | undefined,
): (blockId: string) => number {
  const ref = useRef<{
    lessonId: string | undefined;
    indexById: Map<string, number>;
  }>({ lessonId: undefined, indexById: new Map() });
  if (ref.current.lessonId !== lessonId) {
    ref.current = { lessonId, indexById: new Map() };
  }
  const indexes = ref.current.indexById;
  let nextBatchIndex = 0;
  return (blockId: string): number => {
    const existing = indexes.get(blockId);
    if (existing !== undefined) return existing;
    const assigned = nextBatchIndex;
    nextBatchIndex += 1;
    indexes.set(blockId, assigned);
    return assigned;
  };
}

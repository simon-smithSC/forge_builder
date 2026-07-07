// Tracking + resume wiring hooks for the Player (RECOVERY-PLAN R3).
// Every @forge/xapi import here is TYPE-ONLY so the editor preview bundle
// never ships xapi runtime code; the live tracker object arrives through
// PlayerProps.tracking (absent tracking means no calls are made).

import { useEffect, useRef } from "react";
import type { TrackingPort } from "@forge/xapi";

/** Resume state handed to the Player by the standalone runtime shell. */
export interface PlayerResume {
  /** Bookmarked lesson to reopen. */
  lessonId?: string;
  /** Consumed gating ids (blocks / quiz questions) per lesson. */
  consumedByLesson?: Record<string, string[]>;
  /** Prior quiz attempt counts per quiz lesson id. */
  quizAttempts?: Record<string, number>;
}

/** Payload for PlayerProps.onStateChange (debounced ~1s). */
export interface PlayerStateChange {
  bookmarkLessonId: string;
  consumedByLesson: Record<string, string[]>;
}

export interface CompletedLessonInfo {
  id: string;
  title: string;
  /** Quiz lessons complete via quizSubmitted, not lessonCompleted. */
  isQuiz: boolean;
}

export interface PlayerTrackingInput {
  tracking: TrackingPort | undefined;
  started: boolean;
  currentLesson: { id: string; title: string } | undefined;
  /** Overall course percent from the progress snapshot. */
  percent: number;
  /** Lessons currently at 100%, in course order. */
  completedLessons: CompletedLessonInfo[];
  /** Lessons already complete at mount (resume); never re-announced. */
  initiallyCompletedLessonIds: readonly string[];
}

/**
 * Fires the TrackingPort at the moments SPEC 6.3 requires: sessionStart on
 * mount, lessonOpened per lesson visit, lessonCompleted on first completion
 * (with seconds since the lesson was opened), progressChanged on percent
 * change, sessionEnd once on pagehide.
 */
export function usePlayerTracking(input: PlayerTrackingInput): void {
  const trackingRef = useRef(input.tracking);
  trackingRef.current = input.tracking;

  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    sessionStartedAtRef.current = Date.now();
    trackingRef.current?.sessionStart();
    const handlePageHide = (): void => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      const startedAt = sessionStartedAtRef.current ?? Date.now();
      trackingRef.current?.sessionEnd((Date.now() - startedAt) / 1000);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
    // Mount-only: sessionStart must fire exactly once per player instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lessonOpened whenever a blocks/quiz lesson becomes current (post-cover).
  const openedAtRef = useRef<Map<string, number>>(new Map());
  const lastOpenedIdRef = useRef<string | null>(null);
  const { started, currentLesson } = input;
  useEffect(() => {
    if (!started || !currentLesson) return;
    if (lastOpenedIdRef.current === currentLesson.id) return;
    lastOpenedIdRef.current = currentLesson.id;
    if (!openedAtRef.current.has(currentLesson.id)) {
      openedAtRef.current.set(currentLesson.id, Date.now());
    }
    trackingRef.current?.lessonOpened(currentLesson.id, currentLesson.title);
  }, [started, currentLesson]);

  // lessonCompleted when a lesson first reaches 100%. Resume-complete lessons
  // are pre-seeded so relaunches do not re-emit completion statements. Quiz
  // lessons are marked fired without emitting: their quizSubmitted statement
  // doubles as the lesson completion (SPEC 6.3).
  const firedCompletedRef = useRef<Set<string> | null>(null);
  if (firedCompletedRef.current === null) {
    firedCompletedRef.current = new Set(input.initiallyCompletedLessonIds);
  }
  const { completedLessons } = input;
  useEffect(() => {
    const fired = firedCompletedRef.current;
    if (!fired) return;
    for (const lesson of completedLessons) {
      if (fired.has(lesson.id)) continue;
      fired.add(lesson.id);
      if (lesson.isQuiz) continue;
      const openedAt = openedAtRef.current.get(lesson.id);
      const seconds = openedAt === undefined ? 0 : (Date.now() - openedAt) / 1000;
      trackingRef.current?.lessonCompleted(lesson.id, lesson.title, seconds);
    }
  }, [completedLessons]);

  // progressChanged whenever the overall course percent changes.
  const lastPercentRef = useRef<number | null>(null);
  const { percent } = input;
  useEffect(() => {
    if (lastPercentRef.current === percent) return;
    lastPercentRef.current = percent;
    trackingRef.current?.progressChanged(percent);
  }, [percent]);
}

/**
 * Emits PlayerProps.onStateChange (bookmark + consumed sets) debounced ~1s
 * after consumption or navigation changes. The initial mount state is not
 * echoed back (it came from resume in the first place).
 */
export function useStateChangeEmitter(
  onStateChange: ((change: PlayerStateChange) => void) | undefined,
  bookmarkLessonId: string | undefined,
  consumedByLesson: Readonly<Record<string, ReadonlySet<string>>>,
): void {
  const callbackRef = useRef(onStateChange);
  callbackRef.current = onStateChange;
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (bookmarkLessonId === undefined) return;
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const serialized: Record<string, string[]> = {};
      for (const [lessonId, ids] of Object.entries(consumedByLesson)) {
        serialized[lessonId] = [...ids];
      }
      callbackRef.current?.({ bookmarkLessonId, consumedByLesson: serialized });
    }, 1000);
    return () => clearTimeout(timer);
  }, [bookmarkLessonId, consumedByLesson]);
}

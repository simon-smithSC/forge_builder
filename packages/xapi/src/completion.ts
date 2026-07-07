// Completion and reporting state machine per SPEC 6.5. Pure, no IO.
//
// Tracking modes (PublishSettings.tracking):
//   courseCompletion(requiredLessonPercent): success when the completed
//     lesson percentage reaches the threshold.
//   quizResult(quizLessonId): success/failure driven by the designated quiz.
//
// Reporting modes map which verb fires on success and whether "failed" fires
// when the tracked quiz is failed with no retries remaining:
//   passed-incomplete    success -> passed,          failure -> nothing
//   passed-failed        success -> passed,          failure -> failed
//   completed-incomplete success -> courseCompleted, failure -> nothing
//   completed-failed     success -> courseCompleted, failure -> failed
//
// Guarantees: passed/failed and courseCompleted each fire at most once per
// registration, and never contradict each other without an intervening retry
// (a failure with retries remaining fires nothing, leaving room to pass).

import type { PublishSettings } from "@forge/schema";

export type CompletionIntent =
  | { kind: "progressed"; percent: number }
  | { kind: "lessonCompleted"; lessonId: string }
  | { kind: "courseCompleted" }
  | { kind: "passed" }
  | { kind: "failed" }
  | { kind: "quizCompleted"; lessonId: string };

export interface CompletionCourseInfo {
  lessonIds: string[];
  trackedQuizLessonId?: string;
}

export interface CompletionEngine {
  lessonCompleted(lessonId: string): CompletionIntent[];
  quizResult(
    lessonId: string,
    passed: boolean,
    attemptsExhausted: boolean,
  ): CompletionIntent[];
  snapshot(): {
    firedCompleted: boolean;
    firedOutcome: "passed" | "failed" | null;
    percent: number;
  };
}

export function createCompletionEngine(
  settings: PublishSettings,
  course: CompletionCourseInfo,
): CompletionEngine {
  const lessonIds = new Set(course.lessonIds);
  const completedLessons = new Set<string>();
  const reportsPassedVerb = settings.reportingMode.startsWith("passed");
  const reportsFailedVerb = settings.reportingMode.endsWith("failed");
  const trackedQuizLessonId =
    settings.tracking.mode === "quizResult"
      ? settings.tracking.quizLessonId
      : course.trackedQuizLessonId;

  let firedCompleted = false;
  let firedOutcome: "passed" | "failed" | null = null;
  let succeeded = false;

  const percent = (): number => {
    if (lessonIds.size === 0) {
      return 0;
    }
    return Math.round((completedLessons.size / lessonIds.size) * 100);
  };

  const successIntents = (): CompletionIntent[] => {
    if (succeeded || firedOutcome === "failed") {
      return [];
    }
    succeeded = true;
    if (reportsPassedVerb) {
      firedOutcome = "passed";
      return [{ kind: "passed" }];
    }
    if (!firedCompleted) {
      firedCompleted = true;
      return [{ kind: "courseCompleted" }];
    }
    return [];
  };

  return {
    lessonCompleted(lessonId: string): CompletionIntent[] {
      if (!lessonIds.has(lessonId) || completedLessons.has(lessonId)) {
        return [];
      }
      completedLessons.add(lessonId);
      const current = percent();
      // Lesson boundaries always emit a progressed intent; finer 10% steps
      // from scroll progress are the tracker's responsibility.
      const intents: CompletionIntent[] = [
        { kind: "lessonCompleted", lessonId },
        { kind: "progressed", percent: current },
      ];
      if (
        settings.tracking.mode === "courseCompletion" &&
        current >= settings.tracking.requiredLessonPercent
      ) {
        intents.push(...successIntents());
      }
      return intents;
    },

    quizResult(
      lessonId: string,
      passed: boolean,
      attemptsExhausted: boolean,
    ): CompletionIntent[] {
      const intents: CompletionIntent[] = [{ kind: "quizCompleted", lessonId }];
      const isTrackedQuiz =
        settings.tracking.mode === "quizResult" && lessonId === trackedQuizLessonId;
      if (!isTrackedQuiz) {
        return intents;
      }
      if (passed) {
        intents.push(...successIntents());
        return intents;
      }
      if (
        attemptsExhausted &&
        reportsFailedVerb &&
        !succeeded &&
        firedOutcome === null
      ) {
        firedOutcome = "failed";
        intents.push({ kind: "failed" });
      }
      return intents;
    },

    snapshot() {
      return { firedCompleted, firedOutcome, percent: percent() };
    },
  };
}

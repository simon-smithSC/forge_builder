// Tracking facade: composes StatementBuilder + StatementQueue + completion
// engine behind the TrackingPort the player is wired against. Also wires
// flushOnHide to pagehide/visibilitychange when running in a browser.

import type { PublishSettings } from "@forge/schema";
import type { LaunchContext } from "./launch.js";
import { StatementBuilder, type StatementContextInfo } from "./statements.js";
import {
  createCompletionEngine,
  type CompletionCourseInfo,
  type CompletionIntent,
} from "./completion.js";
import { StatementQueue, type QueueStorage } from "./transport.js";
import type { AnsweredInput, QuizScore } from "./types.js";

export interface TrackingPort {
  lessonOpened(lessonId: string, title: string): void;
  lessonCompleted(lessonId: string, title: string, durationSeconds: number): void;
  questionAnswered(input: AnsweredInput): void;
  quizSubmitted(
    lessonId: string,
    title: string,
    score: QuizScore,
    passed: boolean,
    attemptsExhausted: boolean,
  ): void;
  scenarioChoice(blockId: string, sceneId: string, choiceId: string): void;
  progressChanged(percent: number): void;
  sessionStart(): void;
  sessionEnd(durationSeconds: number): void;
}

export interface XapiTrackerOptions {
  fetchFn?: typeof fetch;
  storage?: QueueStorage;
  batchSize?: number;
  now?: () => Date;
}

/** No-op port powering untracked preview mode. */
export const nullTracker: TrackingPort = {
  lessonOpened: () => undefined,
  lessonCompleted: () => undefined,
  questionAnswered: () => undefined,
  quizSubmitted: () => undefined,
  scenarioChoice: () => undefined,
  progressChanged: () => undefined,
  sessionStart: () => undefined,
  sessionEnd: () => undefined,
};

export function createXapiTracker(
  launch: LaunchContext,
  info: StatementContextInfo,
  settings: PublishSettings,
  course: CompletionCourseInfo,
  options: XapiTrackerOptions = {},
): TrackingPort {
  const now = options.now ?? (() => new Date());
  const builder = new StatementBuilder(launch, info, { now });
  const queue = new StatementQueue({
    endpoint: launch.endpoint,
    auth: launch.auth,
    ...(options.batchSize !== undefined ? { batchSize: options.batchSize } : {}),
    ...(options.storage ? { storage: options.storage } : {}),
    ...(options.fetchFn ? { fetchFn: options.fetchFn } : {}),
  });
  const engine = createCompletionEngine(settings, course);

  let sessionStartedAt: number | null = null;
  let lastReportedPercent = -1;

  const elapsedSeconds = (): number => {
    if (sessionStartedAt === null) {
      return 0;
    }
    return Math.max(0, (now().getTime() - sessionStartedAt) / 1000);
  };

  const emitProgress = (percent: number): void => {
    if (percent <= lastReportedPercent) {
      return;
    }
    lastReportedPercent = percent;
    queue.enqueue(builder.progressed(percent));
  };

  const emitIntents = (
    intents: CompletionIntent[],
    context: { outcomeScore?: QuizScore } = {},
  ): void => {
    for (const intent of intents) {
      switch (intent.kind) {
        case "progressed":
          emitProgress(intent.percent);
          break;
        case "courseCompleted":
          queue.enqueue(builder.courseCompleted(elapsedSeconds()));
          break;
        case "passed":
          queue.enqueue(builder.passed(context.outcomeScore));
          break;
        case "failed":
          queue.enqueue(builder.failed(context.outcomeScore));
          break;
        case "lessonCompleted":
        case "quizCompleted":
          // Echo intents: the triggering statement is emitted by the caller
          // (with title/duration/score the engine does not know about).
          break;
      }
    }
  };

  const wireHideFlush = (): void => {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("pagehide", () => queue.flushOnHide());
    }
    if (
      typeof document !== "undefined" &&
      typeof document.addEventListener === "function"
    ) {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          queue.flushOnHide();
        }
      });
    }
  };
  wireHideFlush();

  return {
    sessionStart(): void {
      sessionStartedAt = now().getTime();
      queue.enqueue(builder.launched());
      queue.enqueue(builder.initialized());
      void queue.flush();
    },

    lessonOpened(lessonId: string, title: string): void {
      queue.enqueue(builder.lessonExperienced(lessonId, title));
      void queue.flush();
    },

    lessonCompleted(lessonId: string, title: string, durationSeconds: number): void {
      const intents = engine.lessonCompleted(lessonId);
      for (const intent of intents) {
        if (intent.kind === "lessonCompleted") {
          queue.enqueue(builder.lessonCompleted(lessonId, title, durationSeconds));
        }
      }
      emitIntents(intents.filter((intent) => intent.kind !== "lessonCompleted"));
      void queue.flush();
    },

    questionAnswered(input: AnsweredInput): void {
      queue.enqueue(builder.answered(input));
      void queue.flush();
    },

    quizSubmitted(
      lessonId: string,
      title: string,
      score: QuizScore,
      passed: boolean,
      attemptsExhausted: boolean,
    ): void {
      // The quiz submission statement (completed on the quiz lesson with
      // result.score) doubles as the lesson completion per SPEC 6.3.
      queue.enqueue(builder.quizCompleted(lessonId, title, score));
      const lessonIntents = engine
        .lessonCompleted(lessonId)
        .filter((intent) => intent.kind !== "lessonCompleted");
      emitIntents(lessonIntents, { outcomeScore: score });
      const quizIntents = engine
        .quizResult(lessonId, passed, attemptsExhausted)
        .filter((intent) => intent.kind !== "quizCompleted");
      emitIntents(quizIntents, { outcomeScore: score });
      void queue.flush();
    },

    scenarioChoice(blockId: string, sceneId: string, choiceId: string): void {
      queue.enqueue(builder.scenarioResponded(blockId, sceneId, choiceId));
      void queue.flush();
    },

    progressChanged(percent: number): void {
      // 10% steps per SPEC 6.3; lesson boundaries arrive via the engine.
      const bucketed = Math.floor(Math.max(0, Math.min(100, percent)) / 10) * 10;
      emitProgress(bucketed);
      void queue.flush();
    },

    sessionEnd(durationSeconds: number): void {
      queue.enqueue(builder.terminated(durationSeconds));
      queue.flushOnHide();
    },
  };
}

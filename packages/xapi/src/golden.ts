// Scripted golden playthrough (SPEC 10.1). One fixed course run drives a
// TrackingPort; the resulting statement stream, normalized (ids, timestamps
// and computed durations stripped), must match the stored golden fixture at
// e2e/xapi/golden-statements.json. Used by both the colocated vitest golden
// test and the runnable proof script e2e/xapi/golden-run.mjs.

import type { PublishSettings } from "@forge/schema";
import type { LaunchContext } from "./launch.js";
import type { StatementContextInfo } from "./statements.js";
import type { CompletionCourseInfo } from "./completion.js";
import type { TrackingPort } from "./tracker.js";
import type { XapiStatement } from "./types.js";

export const goldenLaunchContext: LaunchContext = {
  endpoint: "https://lrs.example.com/xapi/",
  auth: "Basic Z29sZGVuOnJ1bg==",
  actor: {
    objectType: "Agent",
    name: "Golden Learner",
    mbox: "mailto:golden.learner@example.com",
  },
  activityId: "https://xapi.supercell.com/courses/c-golden",
  registration: "3f2b6a1e-9d4c-4f8a-b1c2-7e5d0a9b8c7d",
};

export const goldenContextInfo: StatementContextInfo = {
  courseId: "c-golden",
  courseVersion: "1.2.0",
  packageBuildId: "build-golden-001",
};

export const goldenPublishSettings: PublishSettings = {
  tracking: { mode: "quizResult", quizLessonId: "lq" },
  reportingMode: "passed-failed",
  exitCourseLink: false,
  hideCoverPage: false,
  strictLaunch: false,
  statementProfile: "forge-v1",
};

export const goldenCourseInfo: CompletionCourseInfo = {
  lessonIds: ["l1", "l2", "lq"],
  trackedQuizLessonId: "lq",
};

/**
 * Drives the fixed playthrough: two content lessons (with a knowledge check
 * and a scenario choice), then a quiz lesson answering all six interaction
 * types, submitted with a passing score, then session end.
 */
export function runGoldenPlaythrough(port: TrackingPort): void {
  port.sessionStart();

  port.lessonOpened("l1", "Lesson One");
  port.progressChanged(12);
  port.questionAnswered({
    questionId: "kc-1",
    prompt: "Which policy applies to loot boxes?",
    interaction: {
      type: "choice",
      choices: [
        { id: "choice-a", description: "Policy A" },
        { id: "choice-b", description: "Policy B" },
        { id: "choice-c", description: "Policy C" },
      ],
      correctChoiceIds: ["choice-b"],
      selectedChoiceIds: ["choice-b"],
    },
    success: true,
    attempt: 1,
  });
  port.scenarioChoice("sc-block-1", "scene-1", "choice-escalate");
  port.lessonCompleted("l1", "Lesson One", 120);

  port.lessonOpened("l2", "Lesson Two");
  port.lessonCompleted("l2", "Lesson Two", 60);

  port.lessonOpened("lq", "Final Quiz");
  port.questionAnswered({
    questionId: "q-choice",
    prompt: "Pick both correct answers.",
    interaction: {
      type: "choice",
      choices: [
        { id: "opt-1", description: "Option 1" },
        { id: "opt-2", description: "Option 2" },
        { id: "opt-3", description: "Option 3" },
        { id: "opt-4", description: "Option 4" },
      ],
      correctChoiceIds: ["opt-1", "opt-4"],
      selectedChoiceIds: ["opt-1", "opt-4"],
    },
    success: true,
    score: { raw: 1, min: 0, max: 1, scaled: 1 },
    attempt: 1,
  });
  port.questionAnswered({
    questionId: "q-sequencing",
    prompt: "Order the escalation steps.",
    interaction: {
      type: "sequencing",
      choices: [
        { id: "step-triage", description: "Triage" },
        { id: "step-review", description: "Review" },
        { id: "step-escalate", description: "Escalate" },
      ],
      correctOrder: ["step-triage", "step-review", "step-escalate"],
      selectedOrder: ["step-triage", "step-escalate", "step-review"],
    },
    success: false,
    score: { raw: 0, min: 0, max: 1, scaled: 0 },
    attempt: 1,
  });
  port.questionAnswered({
    questionId: "q-fill-in",
    prompt: "Name the reporting tool.",
    interaction: {
      type: "fill-in",
      acceptedAnswers: ["Learning Locker", "LL"],
      caseSensitive: false,
      response: "learning locker",
    },
    success: true,
    score: { raw: 1, min: 0, max: 1, scaled: 1 },
    attempt: 1,
  });
  port.questionAnswered({
    questionId: "q-matching",
    prompt: "Match the term to its definition.",
    interaction: {
      type: "matching",
      source: [
        { id: "src-lrs", description: "LRS" },
        { id: "src-lms", description: "LMS" },
      ],
      target: [
        { id: "tgt-locker", description: "Stores statements" },
        { id: "tgt-curatr", description: "Delivers courses" },
      ],
      correctPairs: [
        { sourceId: "src-lrs", targetId: "tgt-locker" },
        { sourceId: "src-lms", targetId: "tgt-curatr" },
      ],
      selectedPairs: [
        { sourceId: "src-lrs", targetId: "tgt-locker" },
        { sourceId: "src-lms", targetId: "tgt-curatr" },
      ],
    },
    success: true,
    score: { raw: 1, min: 0, max: 1, scaled: 1 },
    attempt: 1,
  });
  port.questionAnswered({
    questionId: "q-numeric",
    prompt: "How many days to respond?",
    interaction: {
      type: "numeric",
      correct: { kind: "range", min: 3, max: 5 },
      response: 4,
    },
    success: true,
    score: { raw: 1, min: 0, max: 1, scaled: 1 },
    attempt: 1,
  });
  port.questionAnswered({
    questionId: "q-likert",
    prompt: "How confident are you applying this policy?",
    interaction: {
      type: "likert",
      scale: [
        { id: "likert-1", description: "Not confident" },
        { id: "likert-2", description: "Somewhat confident" },
        { id: "likert-3", description: "Confident" },
        { id: "likert-4", description: "Very confident" },
      ],
      selectedId: "likert-3",
    },
    attempt: 1,
  });
  port.quizSubmitted(
    "lq",
    "Final Quiz",
    { raw: 5, min: 0, max: 6, scaled: 0.83 },
    true,
    false,
  );

  port.sessionEnd(600);
}

type NormalizedStatement = Omit<XapiStatement, "id" | "timestamp" | "result"> & {
  id?: undefined;
  timestamp?: undefined;
  result?: Omit<NonNullable<XapiStatement["result"]>, "duration">;
};

/**
 * Strips per-run values: statement id, timestamp, and result.duration
 * (durations derive from wall clocks). Everything else must be stable.
 */
export function normalizeStatement(statement: XapiStatement): NormalizedStatement {
  const clone = JSON.parse(JSON.stringify(statement)) as Record<string, unknown>;
  delete clone["id"];
  delete clone["timestamp"];
  const result = clone["result"];
  if (result && typeof result === "object") {
    delete (result as Record<string, unknown>)["duration"];
  }
  return clone as unknown as NormalizedStatement;
}

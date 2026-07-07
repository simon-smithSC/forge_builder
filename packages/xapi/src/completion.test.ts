// Reporting matrix per SPEC 6.5 and 10.3: all 4 reporting modes x 2 tracking
// modes, asserting exact intent sequences.

import { describe, expect, it } from "vitest";
import type { PublishSettings } from "@forge/schema";
import { createCompletionEngine, type CompletionIntent } from "./completion.js";

type ReportingMode = PublishSettings["reportingMode"];

const REPORTING_MODES: ReportingMode[] = [
  "passed-incomplete",
  "passed-failed",
  "completed-incomplete",
  "completed-failed",
];

function courseCompletionSettings(reportingMode: ReportingMode): PublishSettings {
  return {
    tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
    reportingMode,
    exitCourseLink: false,
    hideCoverPage: false,
    strictLaunch: false,
    statementProfile: "forge-v1",
  };
}

function quizResultSettings(reportingMode: ReportingMode): PublishSettings {
  return {
    tracking: { mode: "quizResult", quizLessonId: "lq" },
    reportingMode,
    exitCourseLink: false,
    hideCoverPage: false,
    strictLaunch: false,
    statementProfile: "forge-v1",
  };
}

function kinds(intents: CompletionIntent[]): string[] {
  return intents.map((intent) =>
    intent.kind === "progressed" ? `progressed:${intent.percent}` : intent.kind,
  );
}

describe("completion matrix: courseCompletion tracking", () => {
  const successVerb: Record<ReportingMode, string> = {
    "passed-incomplete": "passed",
    "passed-failed": "passed",
    "completed-incomplete": "courseCompleted",
    "completed-failed": "courseCompleted",
  };

  for (const mode of REPORTING_MODES) {
    it(`fires ${successVerb[mode]} once at the lesson threshold under ${mode}`, () => {
      const engine = createCompletionEngine(courseCompletionSettings(mode), {
        lessonIds: ["l1", "l2"],
      });
      expect(kinds(engine.lessonCompleted("l1"))).toEqual([
        "lessonCompleted",
        "progressed:50",
      ]);
      expect(kinds(engine.lessonCompleted("l2"))).toEqual([
        "lessonCompleted",
        "progressed:100",
        successVerb[mode],
      ]);
      // Duplicate completion emits nothing further.
      expect(engine.lessonCompleted("l2")).toEqual([]);
      const snapshot = engine.snapshot();
      expect(snapshot.percent).toBe(100);
      if (mode.startsWith("passed")) {
        expect(snapshot.firedOutcome).toBe("passed");
        expect(snapshot.firedCompleted).toBe(false);
      } else {
        expect(snapshot.firedOutcome).toBe(null);
        expect(snapshot.firedCompleted).toBe(true);
      }
    });

    it(`ignores quiz results under courseCompletion tracking (${mode})`, () => {
      const engine = createCompletionEngine(courseCompletionSettings(mode), {
        lessonIds: ["l1", "lq"],
      });
      expect(kinds(engine.quizResult("lq", false, true))).toEqual(["quizCompleted"]);
      expect(engine.snapshot().firedOutcome).toBe(null);
    });
  }

  it("fires success at a partial threshold", () => {
    const engine = createCompletionEngine(
      {
        ...courseCompletionSettings("passed-incomplete"),
        tracking: { mode: "courseCompletion", requiredLessonPercent: 50 },
      },
      { lessonIds: ["l1", "l2"] },
    );
    expect(kinds(engine.lessonCompleted("l1"))).toEqual([
      "lessonCompleted",
      "progressed:50",
      "passed",
    ]);
    expect(kinds(engine.lessonCompleted("l2"))).toEqual([
      "lessonCompleted",
      "progressed:100",
    ]);
  });
});

describe("completion matrix: quizResult tracking", () => {
  const successVerb: Record<ReportingMode, string> = {
    "passed-incomplete": "passed",
    "passed-failed": "passed",
    "completed-incomplete": "courseCompleted",
    "completed-failed": "courseCompleted",
  };
  const firesFailed: Record<ReportingMode, boolean> = {
    "passed-incomplete": false,
    "passed-failed": true,
    "completed-incomplete": false,
    "completed-failed": true,
  };

  for (const mode of REPORTING_MODES) {
    it(`pass after a retryable fail fires ${successVerb[mode]} under ${mode}`, () => {
      const engine = createCompletionEngine(quizResultSettings(mode), {
        lessonIds: ["l1", "lq"],
        trackedQuizLessonId: "lq",
      });
      expect(kinds(engine.lessonCompleted("l1"))).toEqual([
        "lessonCompleted",
        "progressed:50",
      ]);
      // Failed with retries remaining: no outcome verb.
      expect(kinds(engine.quizResult("lq", false, false))).toEqual(["quizCompleted"]);
      // Retry passes.
      expect(kinds(engine.quizResult("lq", true, false))).toEqual([
        "quizCompleted",
        successVerb[mode],
      ]);
      // A second pass never repeats the outcome.
      expect(kinds(engine.quizResult("lq", true, false))).toEqual(["quizCompleted"]);
    });

    it(`fail with no retries remaining ${firesFailed[mode] ? "fires failed" : "fires nothing"} under ${mode}`, () => {
      const engine = createCompletionEngine(quizResultSettings(mode), {
        lessonIds: ["l1", "lq"],
        trackedQuizLessonId: "lq",
      });
      const expected = firesFailed[mode]
        ? ["quizCompleted", "failed"]
        : ["quizCompleted"];
      expect(kinds(engine.quizResult("lq", false, true))).toEqual(expected);
      // Failed fires at most once, and no contradictory pass afterwards.
      expect(kinds(engine.quizResult("lq", false, true))).toEqual(["quizCompleted"]);
      if (firesFailed[mode]) {
        expect(kinds(engine.quizResult("lq", true, false))).toEqual(["quizCompleted"]);
        expect(engine.snapshot().firedOutcome).toBe("failed");
      }
    });

    it(`untracked quiz lessons never fire outcomes under ${mode}`, () => {
      const engine = createCompletionEngine(quizResultSettings(mode), {
        lessonIds: ["l1", "lq", "l-other-quiz"],
        trackedQuizLessonId: "lq",
      });
      expect(kinds(engine.quizResult("l-other-quiz", true, false))).toEqual([
        "quizCompleted",
      ]);
      expect(engine.snapshot().firedOutcome).toBe(null);
    });
  }
});

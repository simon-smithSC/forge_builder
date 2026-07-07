import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildInteractionIri, buildLessonIri } from "@forge/schema";
import {
  goldenContextInfo,
  goldenCourseInfo,
  goldenLaunchContext,
  goldenPublishSettings,
  normalizeStatement,
  runGoldenPlaythrough,
} from "./golden.js";
import { PROGRESS_EXTENSION, StatementBuilder, VERBS } from "./statements.js";
import { createXapiTracker } from "./tracker.js";
import type { XapiStatement } from "./types.js";

const builder = new StatementBuilder(goldenLaunchContext, goldenContextInfo, {
  now: () => new Date("2026-07-07T12:00:00.000Z"),
});

describe("StatementBuilder invariants", () => {
  const statements: XapiStatement[] = [
    builder.launched(),
    builder.initialized(),
    builder.lessonExperienced("l1", "Lesson One"),
    builder.lessonCompleted("l1", "Lesson One", 120),
    builder.progressed(33),
    builder.quizCompleted("lq", "Final Quiz", { raw: 5, min: 0, max: 6, scaled: 0.83 }),
    builder.passed(),
    builder.failed(),
    builder.courseCompleted(300),
    builder.terminated(360),
    builder.scenarioResponded("sc-1", "scene-2", "choice-b"),
  ];

  it("stamps id, actor, timestamp, registration and version extensions on every statement", () => {
    for (const statement of statements) {
      expect(statement.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(statement.actor).toEqual(goldenLaunchContext.actor);
      expect(statement.timestamp).toBe("2026-07-07T12:00:00.000Z");
      expect(statement.context.registration).toBe(goldenLaunchContext.registration);
      const extensions = statement.context.extensions ?? {};
      expect(extensions["https://xapi.supercell.com/extensions/course-version"]).toBe(
        "1.2.0",
      );
      expect(
        extensions["https://xapi.supercell.com/extensions/package-build-id"],
      ).toBe("build-golden-001");
      expect(statement.context.contextActivities?.grouping?.[0]?.id).toBe(
        goldenLaunchContext.activityId,
      );
    }
  });

  it("uses the schema IRI builders for lesson and interaction objects", () => {
    expect(builder.lessonExperienced("l1", "Lesson One").object.id).toBe(
      buildLessonIri("c-golden", "l1"),
    );
    expect(
      builder.answered({
        questionId: "q-1",
        prompt: "P?",
        interaction: {
          type: "choice",
          choices: [{ id: "a", description: "A" }],
          correctChoiceIds: ["a"],
          selectedChoiceIds: ["a"],
        },
        success: true,
        attempt: 1,
      }).object.id,
    ).toBe(buildInteractionIri("c-golden", "q-1"));
    expect(builder.scenarioResponded("sc-1", "scene-2", "choice-b").object.id).toBe(
      buildInteractionIri("c-golden", "sc-1.scene-2"),
    );
  });

  it("formats durations as ISO 8601 and progress via the cmi5 extension", () => {
    expect(builder.lessonCompleted("l1", "L", 90.5).result?.duration).toBe("PT90.5S");
    expect(builder.terminated(600).result?.duration).toBe("PT600S");
    const progressed = builder.progressed(33.4);
    expect(progressed.result?.extensions?.[PROGRESS_EXTENSION]).toBe(33);
    expect(progressed.verb).toEqual(VERBS.progressed);
  });
});

describe("answered response formats per xAPI 1.0.3", () => {
  it("choice: ids joined with [,]", () => {
    const statement = builder.answered({
      questionId: "q-c",
      prompt: "Pick two.",
      interaction: {
        type: "choice",
        choices: [
          { id: "a", description: "A" },
          { id: "b", description: "B" },
          { id: "c", description: "C" },
        ],
        correctChoiceIds: ["a", "c"],
        selectedChoiceIds: ["a", "b"],
      },
      success: false,
      score: { raw: 0, min: 0, max: 1, scaled: 0 },
      attempt: 2,
    });
    expect(statement.result?.response).toBe("a[,]b");
    expect(statement.object.definition?.interactionType).toBe("choice");
    expect(statement.object.definition?.correctResponsesPattern).toEqual(["a[,]c"]);
    expect(statement.object.definition?.choices).toHaveLength(3);
    expect(statement.result?.success).toBe(false);
    expect(statement.result?.score).toEqual({ raw: 0, min: 0, max: 1, scaled: 0 });
    expect(
      statement.context.extensions?.["https://xapi.supercell.com/extensions/attempt"],
    ).toBe(2);
  });

  it("sequencing: ordered ids joined with [,]", () => {
    const statement = builder.answered({
      questionId: "q-s",
      prompt: "Order.",
      interaction: {
        type: "sequencing",
        choices: [
          { id: "s1", description: "One" },
          { id: "s2", description: "Two" },
        ],
        correctOrder: ["s1", "s2"],
        selectedOrder: ["s2", "s1"],
      },
      success: false,
      attempt: 1,
    });
    expect(statement.result?.response).toBe("s2[,]s1");
    expect(statement.object.definition?.correctResponsesPattern).toEqual(["s1[,]s2"]);
    expect(statement.object.definition?.interactionType).toBe("sequencing");
  });

  it("fill-in: raw response with {case_matters=...} correct patterns", () => {
    const statement = builder.answered({
      questionId: "q-f",
      prompt: "Name it.",
      interaction: {
        type: "fill-in",
        acceptedAnswers: ["Answer 1", "Answer One"],
        caseSensitive: true,
        response: "Answer 1",
      },
      success: true,
      attempt: 1,
    });
    expect(statement.result?.response).toBe("Answer 1");
    expect(statement.object.definition?.correctResponsesPattern).toEqual([
      "{case_matters=true}Answer 1",
      "{case_matters=true}Answer One",
    ]);
  });

  it("matching: source[.]target pairs joined with [,]", () => {
    const statement = builder.answered({
      questionId: "q-m",
      prompt: "Match.",
      interaction: {
        type: "matching",
        source: [
          { id: "s1", description: "First choice" },
          { id: "s2", description: "Second choice" },
        ],
        target: [
          { id: "t1", description: "First match" },
          { id: "t2", description: "Second match" },
        ],
        correctPairs: [
          { sourceId: "s1", targetId: "t1" },
          { sourceId: "s2", targetId: "t2" },
        ],
        selectedPairs: [
          { sourceId: "s1", targetId: "t2" },
          { sourceId: "s2", targetId: "t1" },
        ],
      },
      success: false,
      attempt: 1,
    });
    expect(statement.result?.response).toBe("s1[.]t2[,]s2[.]t1");
    expect(statement.object.definition?.correctResponsesPattern).toEqual([
      "s1[.]t1[,]s2[.]t2",
    ]);
    expect(statement.object.definition?.source).toHaveLength(2);
    expect(statement.object.definition?.target).toHaveLength(2);
  });

  it("numeric: value as response, ranges and tolerances as min[:]max", () => {
    const range = builder.answered({
      questionId: "q-n1",
      prompt: "How many?",
      interaction: { type: "numeric", correct: { kind: "range", min: 3, max: 5 }, response: 4 },
      success: true,
      attempt: 1,
    });
    expect(range.result?.response).toBe("4");
    expect(range.object.definition?.correctResponsesPattern).toEqual(["3[:]5"]);

    const exact = builder.answered({
      questionId: "q-n2",
      prompt: "Exactly?",
      interaction: { type: "numeric", correct: { kind: "exact", value: 7 }, response: 6 },
      success: false,
      attempt: 1,
    });
    expect(exact.object.definition?.correctResponsesPattern).toEqual(["7"]);

    const tolerant = builder.answered({
      questionId: "q-n3",
      prompt: "Roughly?",
      interaction: {
        type: "numeric",
        correct: { kind: "exact", value: 10, tolerance: 2 },
        response: 11,
      },
      success: true,
      attempt: 1,
    });
    expect(tolerant.object.definition?.correctResponsesPattern).toEqual(["8[:]12"]);
  });

  it("likert: scale components, no success, no correct pattern", () => {
    const statement = builder.answered({
      questionId: "q-l",
      prompt: "Confidence?",
      interaction: {
        type: "likert",
        scale: [
          { id: "likert-1", description: "Low" },
          { id: "likert-2", description: "High" },
        ],
        selectedId: "likert-2",
      },
      attempt: 1,
    });
    expect(statement.result?.response).toBe("likert-2");
    expect(statement.result?.success).toBeUndefined();
    expect(statement.object.definition?.interactionType).toBe("likert");
    expect(statement.object.definition?.correctResponsesPattern).toBeUndefined();
    expect(statement.object.definition?.scale).toHaveLength(2);
  });
});

describe("golden playthrough", () => {
  it("matches the stored golden statement fixture (ignoring ids/timestamps/durations)", async () => {
    const captured: XapiStatement[] = [];
    const seen = new Set<string>();
    const fetchFn = (async (_url: unknown, init?: RequestInit) => {
      const batch = JSON.parse(String(init?.body)) as XapiStatement[];
      for (const statement of batch) {
        if (!seen.has(statement.id)) {
          seen.add(statement.id);
          captured.push(statement);
        }
      }
      return { ok: true, status: 200 } as Response;
    }) as typeof fetch;

    const tracker = createXapiTracker(
      goldenLaunchContext,
      goldenContextInfo,
      goldenPublishSettings,
      goldenCourseInfo,
      { fetchFn },
    );
    runGoldenPlaythrough(tracker);
    // Let queued flushes settle.
    for (let i = 0; i < 5; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const normalized = captured.map((statement) => normalizeStatement(statement));
    const fixtureUrl = new URL(
      "../../../e2e/xapi/golden-statements.json",
      import.meta.url,
    );
    const fixture = JSON.parse(readFileSync(fixtureUrl, "utf8")) as unknown[];
    expect(normalized).toEqual(fixture);

    const verbCounts = new Map<string, number>();
    for (const statement of captured) {
      const name = statement.verb.display["en-US"] ?? statement.verb.id;
      verbCounts.set(name, (verbCounts.get(name) ?? 0) + 1);
    }
    expect(Object.fromEntries(verbCounts)).toEqual({
      launched: 1,
      initialized: 1,
      experienced: 3,
      progressed: 4,
      answered: 7,
      responded: 1,
      completed: 3,
      passed: 1,
      terminated: 1,
    });
  });
});

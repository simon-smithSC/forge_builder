#!/usr/bin/env node
// Runnable proof for @forge/xapi (RECOVERY-PLAN R3 gate, SPEC 10.1 / 10.3).
// 1. Runs the scripted golden playthrough against a fake LRS fetch, normalizes
//    the captured statements (id/timestamp/duration stripped) and compares them
//    with e2e/xapi/golden-statements.json (generated on first run).
// 2. Exercises the completion/reporting matrix: 4 reporting modes x 2 tracking
//    modes, asserting exact intent sequences.
// Run from the repo root: node e2e/xapi/golden-run.mjs
// Requires a built package: cd packages/xapi && ../../node_modules/.bin/tsc -p tsconfig.json

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  createCompletionEngine,
  createXapiTracker,
  goldenContextInfo,
  goldenCourseInfo,
  goldenLaunchContext,
  goldenPublishSettings,
  normalizeStatement,
  runGoldenPlaythrough,
} from "../../packages/xapi/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, "golden-statements.json");

// ---------------------------------------------------------------------------
// Part 1: golden playthrough
// ---------------------------------------------------------------------------

const captured = [];
const seenIds = new Set();
const fakeFetch = async (_url, init) => {
  const batch = JSON.parse(String(init?.body ?? "[]"));
  for (const statement of batch) {
    // At-least-once transport may resend; statement UUIDs dedupe, exactly as
    // an LRS would.
    if (!seenIds.has(statement.id)) {
      seenIds.add(statement.id);
      captured.push(statement);
    }
  }
  return { ok: true, status: 200 };
};

const tracker = createXapiTracker(
  goldenLaunchContext,
  goldenContextInfo,
  goldenPublishSettings,
  goldenCourseInfo,
  { fetchFn: fakeFetch },
);
runGoldenPlaythrough(tracker);
for (let i = 0; i < 5; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const normalized = captured.map((statement) => normalizeStatement(statement));

if (!existsSync(fixturePath)) {
  mkdirSync(here, { recursive: true });
  writeFileSync(fixturePath, `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(`Golden fixture generated (${normalized.length} statements): ${fixturePath}`);
} else {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  assert.deepEqual(
    normalized,
    fixture,
    "Golden playthrough diverged from e2e/xapi/golden-statements.json",
  );
  console.log(`Golden playthrough matches fixture (${normalized.length} statements).`);
}

const verbCounts = {};
for (const statement of captured) {
  const verb = statement.verb.display["en-US"] ?? statement.verb.id;
  verbCounts[verb] = (verbCounts[verb] ?? 0) + 1;
}
console.log("Per-verb summary:");
for (const [verb, count] of Object.entries(verbCounts)) {
  console.log(`  ${verb.padEnd(12)} ${count}`);
}
assert.deepEqual(verbCounts, {
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

// Every statement carries registration + course version extension.
for (const statement of captured) {
  assert.equal(statement.context.registration, goldenLaunchContext.registration);
  assert.equal(
    statement.context.extensions["https://xapi.supercell.com/extensions/course-version"],
    goldenContextInfo.courseVersion,
  );
  assert.match(statement.id, /^[0-9a-f-]{36}$/i);
  assert.ok(statement.timestamp.endsWith("Z"));
}

// ---------------------------------------------------------------------------
// Part 2: completion matrix (4 reporting modes x 2 tracking modes)
// ---------------------------------------------------------------------------

const REPORTING_MODES = [
  "passed-incomplete",
  "passed-failed",
  "completed-incomplete",
  "completed-failed",
];
const successVerb = {
  "passed-incomplete": "passed",
  "passed-failed": "passed",
  "completed-incomplete": "courseCompleted",
  "completed-failed": "courseCompleted",
};
const firesFailed = {
  "passed-incomplete": false,
  "passed-failed": true,
  "completed-incomplete": false,
  "completed-failed": true,
};
const baseSettings = {
  exitCourseLink: false,
  hideCoverPage: false,
  strictLaunch: false,
  statementProfile: "forge-v1",
};
const kinds = (intents) =>
  intents.map((intent) =>
    intent.kind === "progressed" ? `progressed:${intent.percent}` : intent.kind,
  );

let combos = 0;
for (const reportingMode of REPORTING_MODES) {
  // Tracking mode A: course completion at 100% of lessons.
  {
    const engine = createCompletionEngine(
      {
        ...baseSettings,
        reportingMode,
        tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
      },
      { lessonIds: ["l1", "l2"] },
    );
    assert.deepEqual(kinds(engine.lessonCompleted("l1")), [
      "lessonCompleted",
      "progressed:50",
    ]);
    assert.deepEqual(kinds(engine.lessonCompleted("l2")), [
      "lessonCompleted",
      "progressed:100",
      successVerb[reportingMode],
    ]);
    assert.deepEqual(engine.lessonCompleted("l2"), []);
    console.log(
      `matrix courseCompletion x ${reportingMode}: success -> ${successVerb[reportingMode]}`,
    );
    combos += 1;
  }
  // Tracking mode B: quiz result from the designated quiz lesson.
  {
    const settings = {
      ...baseSettings,
      reportingMode,
      tracking: { mode: "quizResult", quizLessonId: "lq" },
    };
    const course = { lessonIds: ["l1", "lq"], trackedQuizLessonId: "lq" };

    const passEngine = createCompletionEngine(settings, course);
    assert.deepEqual(kinds(passEngine.quizResult("lq", false, false)), [
      "quizCompleted",
    ]);
    assert.deepEqual(kinds(passEngine.quizResult("lq", true, false)), [
      "quizCompleted",
      successVerb[reportingMode],
    ]);
    assert.deepEqual(kinds(passEngine.quizResult("lq", true, false)), [
      "quizCompleted",
    ]);

    const failEngine = createCompletionEngine(settings, course);
    const expectedFail = firesFailed[reportingMode]
      ? ["quizCompleted", "failed"]
      : ["quizCompleted"];
    assert.deepEqual(kinds(failEngine.quizResult("lq", false, true)), expectedFail);
    // Never a contradictory passed after a reported failed.
    if (firesFailed[reportingMode]) {
      assert.deepEqual(kinds(failEngine.quizResult("lq", true, false)), [
        "quizCompleted",
      ]);
      assert.equal(failEngine.snapshot().firedOutcome, "failed");
    }
    console.log(
      `matrix quizResult x ${reportingMode}: pass -> ${successVerb[reportingMode]}, exhausted fail -> ${firesFailed[reportingMode] ? "failed" : "nothing"}`,
    );
    combos += 1;
  }
}
assert.equal(combos, 8);

console.log("");
console.log(
  `PASS: ${captured.length} golden statements verified, ${combos}/8 completion matrix combos green.`,
);

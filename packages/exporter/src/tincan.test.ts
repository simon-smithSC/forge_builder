// Structural conformance tests against docs/reference/tincan.xml.
// Tests run under node (vitest); the shipped build graph excludes them.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildInteractionIri, buildLessonIri } from "@forge/schema";
import { buildTincanXml, TINCAN_ACTIVITY_TYPES } from "./tincan.js";
import { makeCourse, makeSettings } from "./testutil.js";

const referenceXml = readFileSync(
  new URL("../../../docs/reference/tincan.xml", import.meta.url),
  "utf8",
);

interface ParsedActivity {
  id: string;
  type: string;
  body: string;
}

/** Tiny regex/string walker; the documents have no nested <activity>. */
function parseActivities(xml: string): ParsedActivity[] {
  const activities: ParsedActivity[] = [];
  const pattern = /<activity\b([^>]*)>([\s\S]*?)<\/activity>/g;
  for (const match of xml.matchAll(pattern)) {
    const attrs = match[1] ?? "";
    const id = /id="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const type = /type="([^"]*)"/.exec(attrs)?.[1] ?? "";
    activities.push({ id, type, body: match[2] ?? "" });
  }
  return activities;
}

function patternsOf(activity: ParsedActivity): string[] {
  return [...activity.body.matchAll(/<correctResponsePattern>([\s\S]*?)<\/correctResponsePattern>/g)].map(
    (m) => m[1] ?? "",
  );
}

function interactionTypeOf(activity: ParsedActivity): string {
  return /<interactionType>([^<]*)<\/interactionType>/.exec(activity.body)?.[1] ?? "";
}

function elementNames(xml: string): Set<string> {
  const names = new Set<string>();
  for (const match of xml.matchAll(/<([A-Za-z][A-Za-z0-9._:-]*)[\s/>]/g)) {
    names.add(match[1] ?? "");
  }
  return names;
}

const course = makeCourse();
const generated = buildTincanXml(course, makeSettings());
const generatedActivities = parseActivities(generated);
const referenceActivities = parseActivities(referenceXml);

describe("tincan.xml structural conformance vs docs/reference/tincan.xml", () => {
  it("uses exactly the reference activity type IRIs", () => {
    const referenceTypes = new Set(referenceActivities.map((a) => a.type));
    const generatedTypes = new Set(generatedActivities.map((a) => a.type));
    expect(generatedTypes).toEqual(referenceTypes);
    expect(generatedTypes).toEqual(
      new Set([
        TINCAN_ACTIVITY_TYPES.course,
        TINCAN_ACTIVITY_TYPES.module,
        TINCAN_ACTIVITY_TYPES.interaction,
      ]),
    );
  });

  it("uses the same element vocabulary as the reference for shared structures", () => {
    const referenceNames = elementNames(referenceXml);
    const generatedNames = elementNames(generated);
    for (const name of [
      "tincan",
      "activities",
      "activity",
      "name",
      "description",
      "launch",
      "interactionType",
      "correctResponsePatterns",
      "correctResponsePattern",
      "choices",
      "component",
      "id",
      "source",
      "target",
    ]) {
      expect(referenceNames.has(name), `reference has <${name}>`).toBe(true);
      expect(generatedNames.has(name), `generated has <${name}>`).toBe(true);
    }
    // Beyond the reference vocabulary we only add the xsd-defined
    // component lists for question types the reference course lacks.
    const extra = [...generatedNames].filter((n) => !referenceNames.has(n));
    expect(extra.sort()).toEqual(["scale", "steps"]);
  });

  it("declares the same xmlns as the reference", () => {
    for (const ns of [
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      'xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
      'xmlns="http://projecttincan.com/tincan.xsd"',
    ]) {
      expect(referenceXml).toContain(ns);
      expect(generated).toContain(ns);
    }
  });

  it("emits a course activity with name, description, and launch", () => {
    const courseActivity = generatedActivities.find(
      (a) => a.type === TINCAN_ACTIVITY_TYPES.course,
    );
    expect(courseActivity).toBeDefined();
    expect(courseActivity?.body).toContain("<name lang=");
    expect(courseActivity?.body).toContain("<description lang=");
    expect(courseActivity?.body).toContain(">index.html</launch>");
    // Same shape as the reference course activity.
    const referenceCourse = referenceActivities.find(
      (a) => a.type === TINCAN_ACTIVITY_TYPES.course,
    );
    expect(referenceCourse?.body).toContain("<launch");
  });

  it("emits one module activity per non-section lesson", () => {
    const modules = generatedActivities.filter(
      (a) => a.type === TINCAN_ACTIVITY_TYPES.module,
    );
    expect(modules.map((m) => m.id)).toEqual([
      buildLessonIri(course.id, "lesson_blocks"),
      buildLessonIri(course.id, "lesson_quiz"),
    ]);
  });

  it("emits one interaction per quiz question and per knowledgeCheck block", () => {
    const interactions = generatedActivities.filter(
      (a) => a.type === TINCAN_ACTIVITY_TYPES.interaction,
    );
    // 2 knowledge checks + 8 quiz questions in the fixture.
    expect(interactions).toHaveLength(10);
    expect(interactions.map((a) => a.id)).toContain(
      buildInteractionIri(course.id, "block_kc_choice"),
    );
    expect(interactions.map((a) => a.id)).toContain(
      buildInteractionIri(course.id, "q_mc"),
    );
  });
});

describe("correctResponsesPattern formats per interaction type", () => {
  const byId = new Map(generatedActivities.map((a) => [a.id, a]));
  const interaction = (id: string): ParsedActivity => {
    const activity = byId.get(buildInteractionIri(course.id, id));
    if (!activity) throw new Error(`missing interaction ${id}`);
    return activity;
  };

  it("choice: single correct id, like the reference choice interaction", () => {
    const referenceChoice = referenceActivities.find(
      (a) => interactionTypeOf(a) === "choice",
    );
    expect(referenceChoice && patternsOf(referenceChoice)[0]).toMatch(/^[^[\]]+$/);
    const mc = interaction("q_mc");
    expect(interactionTypeOf(mc)).toBe("choice");
    expect(patternsOf(mc)).toEqual(["mc_a"]);
  });

  it("choice (multiple response): correct ids joined with [,]", () => {
    const mr = interaction("q_mr");
    expect(interactionTypeOf(mr)).toBe("choice");
    expect(patternsOf(mr)).toEqual(["mr_a[,]mr_b"]);
    expect(mr.body).toContain("<choices>");
    expect(mr.body).toContain("<id>mr_c</id>");
  });

  it("fill-in: {case_matters=...} prefix like the reference", () => {
    const referenceFillIn = referenceActivities.find((a) =>
      interactionTypeOf(a).includes("fill-in"),
    );
    expect(referenceFillIn && patternsOf(referenceFillIn)[0]).toMatch(
      /^\{case_matters=(true|false)\}/,
    );
    const fib = interaction("q_fib");
    expect(interactionTypeOf(fib)).toBe("fill-in");
    expect(patternsOf(fib)).toEqual(["{case_matters=false}xAPI[,]Tin Can"]);
  });

  it("matching: source_x[.]target_x pairs with [,] separators and source/target lists", () => {
    const referenceMatching = referenceActivities.find(
      (a) => interactionTypeOf(a) === "matching",
    );
    expect(referenceMatching && patternsOf(referenceMatching)[0]).toMatch(
      /^source_[^[]+\[\.\]target_/,
    );
    const match = interaction("q_match");
    expect(interactionTypeOf(match)).toBe("matching");
    expect(patternsOf(match)).toEqual([
      "source_qpair_1[.]target_qpair_1[,]source_qpair_2[.]target_qpair_2",
    ]);
    expect(match.body).toContain("<source>");
    expect(match.body).toContain("<target>");
    expect(match.body).toContain("<id>source_qpair_1</id>");
    expect(match.body).toContain("<id>target_qpair_1</id>");
  });

  it("sequencing: ids in correct order joined with [,] plus steps list", () => {
    const seq = interaction("q_seq");
    expect(interactionTypeOf(seq)).toBe("sequencing");
    expect(patternsOf(seq)).toEqual(["seq_a[,]seq_b[,]seq_c"]);
    expect(seq.body).toContain("<steps>");
  });

  it("numeric: exact value or min[:]max range", () => {
    expect(patternsOf(interaction("q_num_exact"))).toEqual(["42"]);
    expect(patternsOf(interaction("q_num_range"))).toEqual(["1[:]10"]);
  });

  it("likert: declares the scale, no correct response pattern", () => {
    const likert = interaction("q_likert");
    expect(interactionTypeOf(likert)).toBe("likert");
    expect(patternsOf(likert)).toEqual([]);
    expect(likert.body).toContain("<scale>");
    expect(likert.body).toContain("<id>likert_1</id>");
  });

  it("components carry id + description exactly like the reference", () => {
    const referenceComponent =
      /<component>\s*<id>[^<]+<\/id>\s*<description lang="[^"]*">[^<]*<\/description>\s*<\/component>/;
    expect(referenceXml).toMatch(referenceComponent);
    expect(generated).toMatch(referenceComponent);
  });
});

describe("buildTincanXml options", () => {
  it("honors launchHref and iriBase", () => {
    const xml = buildTincanXml(course, makeSettings(), {
      iriBase: "https://example.org/xapi/",
      launchHref: "start.html",
    });
    expect(xml).toContain(
      `id="https://example.org/xapi/courses/${course.id}" type="${TINCAN_ACTIVITY_TYPES.course}"`,
    );
    expect(xml).toContain(">start.html</launch>");
  });

  it("is deterministic", () => {
    expect(buildTincanXml(course, makeSettings())).toBe(
      buildTincanXml(course, makeSettings()),
    );
  });
});

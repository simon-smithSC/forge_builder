import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import * as Y from "yjs";
import {
  CURRENT_SCHEMA_VERSION,
  blockFamilyVariants,
  blockSchema,
  buildBlockIri,
  buildCourseIri,
  buildInteractionIri,
  buildLessonIri,
  courseDocMigrationRegistry,
  courseDocSchema,
  createUlid,
  generateJsonSchemas,
  isUlid,
  materializeCourseDocForYjs,
  migrateCourseDoc,
  publishSettingsSchema,
  richTextSanitizerConfig,
  roundTripCourseDocThroughYjs,
  isSafeHtmlFragment,
  isSafeStyleAttribute,
  stateDocumentEnvelopeSchema,
  validateCourseDoc,
} from "./index.js";
import type { BlockFor } from "./index.js";

const packageRootPath = fileURLToPath(new URL("..", import.meta.url));
const fixturePath = resolve(
  packageRootPath,
  "fixtures/kitchen-sink.json",
);
const packageJsonPath = resolve(packageRootPath, "package.json");
const tsconfigBuildPath = resolve(packageRootPath, "tsconfig.build.json");

const loadKitchenSink = (): unknown => {
  const exists = existsSync(fixturePath);
  expect(exists).toBe(true);
  return JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
};

const loadJsonFile = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

describe("Forge schema public API", () => {
  it("keeps schema package runtime and build configuration strict", () => {
    const manifest = loadJsonFile(packageJsonPath) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(manifest.dependencies?.yjs).toBeDefined();
    expect(manifest.devDependencies?.yjs).toBeUndefined();
    expect(manifest.scripts?.test).toBe("vitest run");
    expect(manifest.scripts?.build).toContain("tsconfig.build.json");

    const buildConfig = loadJsonFile(tsconfigBuildPath) as {
      exclude?: string[];
    };
    expect(buildConfig.exclude).toContain("src/**/*.test.ts");
  });

  it("preserves family, variant, and payload relationships in public block types", () => {
    type ParagraphBlock = BlockFor<"text", "paragraph">;
    expectTypeOf<ParagraphBlock["family"]>().toEqualTypeOf<"text">();
    expectTypeOf<ParagraphBlock["variant"]>().toEqualTypeOf<"paragraph">();
    expectTypeOf<ParagraphBlock["payload"]>().toEqualTypeOf<{
      html: string;
      audioMediaId?: string | undefined;
    }>();

    type TableBlock = BlockFor<"table", "basic">;
    expectTypeOf<
      TableBlock["payload"]["rows"][number]["cells"][number]
    >().toEqualTypeOf<{
      id: string;
      columnId: string;
      html: string;
    }>();

    type EmbedBlock = BlockFor<"multimedia", "embed">;
    expectTypeOf<EmbedBlock["payload"]>().toMatchTypeOf<{
      url: string;
      title: string;
      allowFullscreen: boolean;
      aspectRatio: "16:9" | "4:3" | "1:1";
    }>();
  });

  it("validates the kitchen sink fixture with every block variant and question type", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const blocks = course.lessons.flatMap((lesson) =>
      lesson.type === "blocks" ? lesson.blocks : [],
    );
    const presentBlockKeys = new Set(
      blocks.map((block) => `${block.family}:${block.variant}`),
    );

    for (const [family, variants] of Object.entries(blockFamilyVariants)) {
      for (const variant of variants) {
        expect(presentBlockKeys.has(`${family}:${variant}`)).toBe(true);
      }
    }

    const questionTypes = new Set(
      course.lessons.flatMap((lesson) =>
        lesson.type === "quiz"
          ? lesson.questions.map((question) => question.type)
          : [],
      ),
    );
    expect(questionTypes).toEqual(
      new Set([
        "MULTIPLE_CHOICE",
        "MULTIPLE_RESPONSE",
        "FILL_IN_THE_BLANK",
        "MATCHING",
        "SEQUENCING",
        "NUMERIC",
        "LIKERT",
      ]),
    );
  });

  it("rejects an empty payload for every block family", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const blocks = course.lessons.flatMap((lesson) =>
      lesson.type === "blocks" ? lesson.blocks : [],
    );

    for (const family of Object.keys(blockFamilyVariants)) {
      const validBlock = blocks.find((block) => block.family === family);
      expect(validBlock).toBeDefined();
      if (!validBlock) {
        continue;
      }

      const invalidBlock = { ...validBlock, payload: {} };
      expect(blockSchema.safeParse(invalidBlock).success).toBe(false);
    }
  });

  it("validates publish settings and State API document envelopes", () => {
    expect(
      publishSettingsSchema.parse({
        tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
        reportingMode: "passed-incomplete",
        exitCourseLink: true,
        hideCoverPage: false,
        strictLaunch: false,
        statementProfile: "forge-v1",
      }),
    ).toMatchObject({
      tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
    });

    expect(
      stateDocumentEnvelopeSchema.parse({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        activityId: buildCourseIri("course_01"),
        courseId: "course_01",
        registration: "8f315f56-4a72-49a1-b20c-0f817f4bdbfd",
        updatedAt: "2026-07-04T10:00:00.000Z",
        state: {
          bookmark: {
            lessonId: "lesson_blocks",
            blockId: "block_text_paragraph",
            scrollAnchor: "block_text_paragraph",
          },
          progress: {
            lessons: {
              lesson_blocks: {
                completed: false,
                percentComplete: 20,
                consumedBlockBitset: "1000",
                blockCount: 4,
              },
            },
          },
          quiz: {
            quiz_final: {
              attempts: [
                {
                  attempt: 1,
                  score: { raw: 1, min: 0, max: 3, scaled: 0.3333 },
                  passed: false,
                  answeredAt: "2026-07-04T10:05:00.000Z",
                },
              ],
            },
          },
          interactions: {
            checklist_tasks: { checkedIds: ["task_01"] },
          },
        },
      }),
    ).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION });
  });

  it("requires State API progress to use block-index bitsets", () => {
    const idsOnlyState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      activityId: buildCourseIri("course_01"),
      courseId: "course_01",
      updatedAt: "2026-07-04T10:00:00.000Z",
      state: {
        progress: {
          lessons: {
            lesson_blocks: {
              completed: false,
              percentComplete: 20,
              consumedBlockIds: ["block_text_paragraph"],
            },
          },
        },
        quiz: {},
        interactions: {},
      },
    };

    expect(stateDocumentEnvelopeSchema.safeParse(idsOnlyState).success).toBe(false);
  });

  it("accepts the 1.1.0 teardown additions and keeps them constrained", () => {
    const course = validateCourseDoc(loadKitchenSink());
    expect(course.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(course.author).toBe("Forge Fixtures Team");

    const blocks = course.lessons.flatMap((lesson) =>
      lesson.type === "blocks" ? lesson.blocks : [],
    );
    const paragraphBlock = blocks.find(
      (block) => block.id === "block_text_paragraph",
    );
    if (!paragraphBlock || paragraphBlock.family !== "text") {
      throw new Error("Expected paragraph block in fixture.");
    }
    const paragraphPayload = paragraphBlock.payload as { audioMediaId?: string };
    expect(paragraphPayload.audioMediaId).toBe("audio_text_narration");
    expect(course.media["audio_text_narration"]?.kind).toBe("audio");

    const buttonsBlock = blocks.find((block) => block.id === "block_buttons_single");
    if (!buttonsBlock || buttonsBlock.family !== "buttons") {
      throw new Error("Expected single button block in fixture.");
    }
    const firstButton = (
      buttonsBlock.payload as {
        buttons: { title?: string; description?: string }[];
      }
    ).buttons[0];
    expect(firstButton?.title).toBe("<p>Location 1</p>");
    expect(firstButton?.description).toBe(
      "<p>This location can be a URL, another lesson, or an email address.</p>",
    );

    expect(
      courseDocSchema.safeParse({
        ...(loadKitchenSink() as Record<string, unknown>),
        author: "",
      }).success,
    ).toBe(false);

    const unsafeButton = structuredClone(buttonsBlock) as unknown as Record<
      string,
      unknown
    >;
    unsafeButton.payload = {
      buttons: [
        {
          id: "button_unsafe",
          label: "Visit example",
          description: "<p>ok</p><script>alert('owned')</script>",
          destination: { type: "url", url: "https://example.com" },
        },
      ],
    };
    expect(blockSchema.safeParse(unsafeButton).success).toBe(false);
  });

  it("migrates a 1.0.0 course doc through the chain to the current version", () => {
    const legacyDoc: Record<string, unknown> = {
      ...(loadKitchenSink() as Record<string, unknown>),
      schemaVersion: "1.0.0",
    };
    delete legacyDoc.author;
    const original = structuredClone(legacyDoc);

    const migrated = migrateCourseDoc(legacyDoc);

    expect(legacyDoc).toEqual(original);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.author).toBeUndefined();
    expect(migrated.title).toBe(original.title);
    expect(migrated.lessons).toEqual(
      validateCourseDoc({ ...original, schemaVersion: CURRENT_SCHEMA_VERSION })
        .lessons,
    );
    expect(courseDocMigrationRegistry.map((migration) => migration.from)).toContain(
      "1.0.0",
    );
  });

  it("migrates a 1.1.0 course doc to 1.2.0, moving headerImage into header", () => {
    const legacyDoc = structuredClone(loadKitchenSink()) as Record<string, unknown>;
    legacyDoc.schemaVersion = "1.1.0";
    delete legacyDoc.cover;
    delete legacyDoc.descriptionHtml;
    const legacyLessons = legacyDoc.lessons as Record<string, unknown>[];
    for (const lesson of legacyLessons) {
      if (lesson.type === "blocks") {
        delete lesson.header;
        lesson.headerImage = "image_cover";
      }
    }
    const original = structuredClone(legacyDoc);

    const migrated = migrateCourseDoc(legacyDoc);

    expect(legacyDoc).toEqual(original);
    expect(migrated.schemaVersion).toBe("1.2.0");
    expect(migrated.cover).toBeUndefined();
    expect(migrated.descriptionHtml).toBeUndefined();
    const blocksLesson = migrated.lessons.find((lesson) => lesson.type === "blocks");
    if (!blocksLesson || blocksLesson.type !== "blocks") {
      throw new Error("Expected blocks lesson after migration.");
    }
    expect(blocksLesson.header).toEqual({ imageMediaId: "image_cover" });
    expect(
      (blocksLesson as unknown as Record<string, unknown>).headerImage,
    ).toBeUndefined();
    expect(courseDocMigrationRegistry.map((migration) => migration.from)).toContain(
      "1.1.0",
    );
  });

  it("accepts the 1.2.0 cover, descriptionHtml, and lesson header fields", () => {
    const course = validateCourseDoc(loadKitchenSink());
    expect(course.cover).toEqual({ mediaId: "image_cover", layout: "hero" });
    expect(course.descriptionHtml).toBe("<p>Rich <strong>description</strong></p>");

    const blocksLesson = course.lessons.find((lesson) => lesson.type === "blocks");
    if (!blocksLesson || blocksLesson.type !== "blocks") {
      throw new Error("Expected blocks lesson in fixture.");
    }
    expect(blocksLesson.header).toEqual({
      imageMediaId: "image_cover",
      backgroundColor: "#1f2328",
      overlayOpacity: 55,
    });

    // Constraints hold: overlayOpacity is an int 0-100, layout is an enum.
    expect(
      courseDocSchema.safeParse({
        ...(loadKitchenSink() as Record<string, unknown>),
        cover: { mediaId: "image_cover", layout: "hero", overlayOpacity: 101 },
      }).success,
    ).toBe(false);
    expect(
      courseDocSchema.safeParse({
        ...(loadKitchenSink() as Record<string, unknown>),
        cover: { mediaId: "image_cover", layout: "banner" },
      }).success,
    ).toBe(false);
  });

  it("accepts allowlisted inline styles in sanitized fragments", () => {
    expect(isSafeHtmlFragment('<p><span style="color: #ff0000">red</span></p>')).toBe(
      true,
    );
    expect(
      isSafeHtmlFragment(
        '<p><span style="font-size: 18px; font-family: Inter, sans-serif">t</span></p>',
      ),
    ).toBe(true);
    expect(
      isSafeHtmlFragment('<p><mark style="background-color: rgb(255, 230, 0)">hi</mark></p>'),
    ).toBe(true);
    expect(isSafeHtmlFragment('<p style="text-align: center">centered</p>')).toBe(
      true,
    );
    expect(isSafeHtmlFragment('<p style="line-height: 1.5">spaced</p>')).toBe(true);
    expect(isSafeStyleAttribute("h2", "text-align: right; line-height: 2;")).toBe(
      true,
    );
    expect(isSafeStyleAttribute("li", "text-align: left")).toBe(true);
  });

  it("rejects inline styles outside the allowlist", () => {
    expect(isSafeHtmlFragment('<p style="background: url(x)">bad</p>')).toBe(false);
    expect(isSafeHtmlFragment('<p style="position: fixed">bad</p>')).toBe(false);
    expect(
      isSafeHtmlFragment('<p><span style="color: expression(alert(1))">bad</span></p>'),
    ).toBe(false);
    // style is not allowlisted on strong at all.
    expect(
      isSafeHtmlFragment('<p><strong style="color: #ff0000">bad</strong></p>'),
    ).toBe(false);
    expect(isSafeStyleAttribute("span", "color: #ff0000; behavior: bad")).toBe(false);
    expect(isSafeStyleAttribute("span", "background-color: url(evil)")).toBe(false);
    expect(isSafeStyleAttribute("span", "font-family: @import")).toBe(false);
    expect(isSafeStyleAttribute("span", "color: #ff0000\\65")).toBe(false);
    expect(isSafeStyleAttribute("mark", "color: #ff0000")).toBe(false);
    expect(isSafeStyleAttribute("p", "color: #ff0000")).toBe(false);
  });

  it("migrates legacy course docs without mutating the input", () => {
    const legacyCourseId = createUlid();
    const legacyDoc = {
      schemaVersion: "0.9.0",
      id: legacyCourseId,
      title: "Legacy course",
      description: "A pre-Forge draft.",
      lessons: [{ type: "section", id: "section_01", title: "Start" }],
    };
    const original = structuredClone(legacyDoc);

    const migrated = migrateCourseDoc(legacyDoc);

    expect(legacyDoc).toEqual(original);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.defaultLocale).toBe("en-US");
    expect(courseDocMigrationRegistry.map((migration) => migration.from)).toContain(
      "0.9.0",
    );
  });

  it("builds stable xAPI activity IRIs", () => {
    expect(buildCourseIri("course 01")).toBe(
      "https://xapi.supercell.com/courses/course%2001",
    );
    expect(buildLessonIri("course 01", "lesson/intro")).toBe(
      "https://xapi.supercell.com/courses/course%2001/lessons/lesson%2Fintro",
    );
    expect(buildBlockIri("course 01", "lesson/intro", "block#1")).toBe(
      "https://xapi.supercell.com/courses/course%2001/lessons/lesson%2Fintro/blocks/block%231",
    );
    expect(buildInteractionIri("course 01", "question?1")).toBe(
      "https://xapi.supercell.com/courses/course%2001/interactions/question%3F1",
    );
  });

  it("exports ULID helpers and requires CourseDoc id plus BCP 47 locale", () => {
    const generated = createUlid();
    expect(isUlid(generated)).toBe(true);
    expect(validateCourseDoc(loadKitchenSink()).id).toBe("01JZ9S99Z8A0Y4Y6RAZ76D9M7F");

    const invalidIdDoc = {
      ...(loadKitchenSink() as Record<string, unknown>),
      id: "course_kitchen_sink",
    };
    expect(courseDocSchema.safeParse(invalidIdDoc).success).toBe(false);

    const invalidLocaleDoc = {
      ...(loadKitchenSink() as Record<string, unknown>),
      defaultLocale: "not a locale",
    };
    expect(courseDocSchema.safeParse(invalidLocaleDoc).success).toBe(false);
  });

  it("rejects points on Likert survey questions", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const quizLesson = course.lessons.find((lesson) => lesson.type === "quiz");
    if (!quizLesson || quizLesson.type !== "quiz") {
      throw new Error("Expected quiz lesson in fixture.");
    }
    const likertQuestion = quizLesson.questions.find(
      (question) => question.type === "LIKERT",
    );
    if (!likertQuestion) {
      throw new Error("Expected Likert question in fixture.");
    }

    const invalidCourse = structuredClone(course);
    const invalidQuizLesson = invalidCourse.lessons.find(
      (lesson) => lesson.type === "quiz",
    );
    if (!invalidQuizLesson || invalidQuizLesson.type !== "quiz") {
      throw new Error("Expected quiz lesson in cloned fixture.");
    }
    const invalidLikertQuestion = invalidQuizLesson.questions.find(
      (question) => question.type === "LIKERT",
    );
    if (!invalidLikertQuestion) {
      throw new Error("Expected Likert question in cloned fixture.");
    }
    Object.assign(invalidLikertQuestion, { points: 1 });

    expect(courseDocSchema.safeParse(invalidCourse).success).toBe(false);
  });

  it("requires table cells to reference stable column ids", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const tableBlocks = course.lessons.flatMap((lesson) =>
      lesson.type === "blocks"
        ? lesson.blocks.filter((block) => block.family === "table")
        : [],
    );

    expect(tableBlocks.length).toBeGreaterThan(0);
    for (const tableBlock of tableBlocks) {
      const payload = tableBlock.payload as {
        columns: { id: string; html: string }[];
        rows: { cells: { columnId?: string; html: string }[] }[];
      };
      const columnIds = new Set(payload.columns.map((column) => column.id));

      for (const row of payload.rows) {
        expect(row.cells.every((cell) => Boolean(cell.columnId))).toBe(true);
        expect(row.cells.every((cell) => columnIds.has(cell.columnId ?? ""))).toBe(
          true,
        );
      }
    }

    const invalidTable = structuredClone(tableBlocks[0]) as unknown as Record<
      string,
      unknown
    >;
    if (!invalidTable) {
      throw new Error("Expected at least one table block in fixture.");
    }
    invalidTable.payload = {
      caption: "Invalid table",
      headerRow: true,
      headerColumn: true,
      columns: [{ id: "column_a", html: "<p>A</p>" }],
      rows: [
        {
          id: "row_01",
          cells: [{ id: "cell_01", html: "<p>A1</p>" }],
        },
      ],
    };

    expect(blockSchema.safeParse(invalidTable).success).toBe(false);
  });

  it("rejects multimedia embed URLs outside the shared allowlist", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const embedBlock = course.lessons
      .flatMap((lesson) => (lesson.type === "blocks" ? lesson.blocks : []))
      .find(
        (block) => block.family === "multimedia" && block.variant === "embed",
      );
    expect(embedBlock).toBeDefined();
    if (!embedBlock) {
      return;
    }

    expect(blockSchema.safeParse(embedBlock).success).toBe(true);
    expect(
      blockSchema.safeParse({
        ...embedBlock,
        payload: {
          ...embedBlock.payload,
          url: "https://evil.example.com/embed/training",
        },
      }).success,
    ).toBe(false);
  });

  it("generates JSON Schema documents from the Zod source", () => {
    const schemas = generateJsonSchemas();
    expect(Object.keys(schemas).sort()).toEqual([
      "course-doc.schema.json",
      "publish-settings.schema.json",
      "state-document-envelope.schema.json",
    ]);
    expect(schemas["course-doc.schema.json"]).toMatchObject({
      title: "CourseDoc",
      $schema: "http://json-schema.org/draft-07/schema#",
    });
  });

  it("emits JSON Schema constraints for course ids and locales", () => {
    const courseDocJsonSchema = generateJsonSchemas()["course-doc.schema.json"] as {
      properties?: {
        id?: { pattern?: string };
        defaultLocale?: { pattern?: string };
      };
      definitions?: {
        CourseDoc?: {
          properties?: {
            id?: { pattern?: string };
            defaultLocale?: { pattern?: string };
          };
        };
      };
    };
    const properties =
      courseDocJsonSchema.properties ??
      courseDocJsonSchema.definitions?.CourseDoc?.properties;

    expect(properties?.id?.pattern).toBe("^[0-7][0-9A-HJKMNP-TV-Z]{25}$");
    expect(properties?.defaultLocale?.pattern).toBeTruthy();
  });

  it("emits the embed allowlist constraint into JSON Schema", () => {
    const courseDocJsonSchemaText = JSON.stringify(
      generateJsonSchemas()["course-doc.schema.json"],
    );

    expect(courseDocJsonSchemaText).toContain("youtube");
    expect(courseDocJsonSchemaText).toContain("player");
    expect(courseDocJsonSchemaText).toContain("powerbi");
  });

  it("emits sanitizer metadata for rich HTML fields into JSON Schema", () => {
    const courseDocJsonSchemaText = JSON.stringify(
      generateJsonSchemas()["course-doc.schema.json"],
    );

    expect(courseDocJsonSchemaText).toContain("forge:sanitized-html-fragment");
    expect(courseDocJsonSchemaText).toContain("x-forge-sanitizer");
  });

  it("exports shared rich text sanitizer configuration", () => {
    expect(richTextSanitizerConfig.allowedTags).toContain("strong");
    expect(richTextSanitizerConfig.allowedTags).toContain("a");
    expect(richTextSanitizerConfig.allowedTags).not.toContain("script");
    expect(richTextSanitizerConfig.allowedSchemes).toEqual(["http", "https", "mailto"]);
    expect(isSafeHtmlFragment("<p>ok</p><script")).toBe(false);
    expect(isSafeHtmlFragment("<div>not allowed</div>")).toBe(false);
    expect(isSafeHtmlFragment("<p onclick=\"alert(1)\">bad</p>")).toBe(false);
    expect(isSafeHtmlFragment("<a href=\"javascript:alert(1)\">bad</a>")).toBe(
      false,
    );
  });

  it("rejects unsafe sanitized HTML fragments", () => {
    const unsafeCourse = structuredClone(
      validateCourseDoc(loadKitchenSink()),
    );
    const blocksLesson = unsafeCourse.lessons.find(
      (lesson) => lesson.type === "blocks",
    );
    if (!blocksLesson || blocksLesson.type !== "blocks") {
      throw new Error("Expected blocks lesson in fixture.");
    }
    const textBlock = blocksLesson.blocks.find(
      (block) => block.family === "text" && block.variant === "paragraph",
    );
    if (!textBlock) {
      throw new Error("Expected paragraph block in fixture.");
    }

    textBlock.payload = {
      html: "<p>Safe copy.</p><script>alert('owned')</script>",
    } as never;

    expect(courseDocSchema.safeParse(unsafeCourse).success).toBe(false);
  });

  it("round-trips the fixture through lesson and block Yjs structures", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const blocksLessonIndex = course.lessons.findIndex(
      (lesson) => lesson.type === "blocks",
    );
    const blocksLesson = course.lessons[blocksLessonIndex];
    if (!blocksLesson || blocksLesson.type !== "blocks") {
      throw new Error("Expected blocks lesson in fixture.");
    }
    const asideBlockIndex = blocksLesson.blocks.findIndex(
      (block) => block.id === "block_image_text_aside",
    );
    const asideBlock = blocksLesson.blocks[asideBlockIndex];
    if (!asideBlock) {
      throw new Error("Expected text-aside image block in fixture.");
    }
    asideBlock.payload = {
      ...(asideBlock.payload as Record<string, unknown>),
      text: "Plain image aside copy",
    } as never;

    const quizLessonIndex = course.lessons.findIndex(
      (lesson) => lesson.type === "quiz",
    );
    const quizLesson = course.lessons[quizLessonIndex];
    if (!quizLesson || quizLesson.type !== "quiz") {
      throw new Error("Expected quiz lesson in fixture.");
    }
    const multipleChoiceIndex = quizLesson.questions.findIndex(
      (question) => question.id === "question_mc",
    );
    const multipleChoiceQuestion = quizLesson.questions[multipleChoiceIndex];
    if (!multipleChoiceQuestion || multipleChoiceQuestion.type !== "MULTIPLE_CHOICE") {
      throw new Error("Expected multiple choice question in fixture.");
    }
    multipleChoiceQuestion.feedback = {
      correct: "Plain correct feedback",
      incorrect: "Plain incorrect feedback",
    };

    const materialized = materializeCourseDocForYjs(course);
    const blocksLessonDoc = materialized.lessonDocs.get("lesson_blocks");
    if (!blocksLessonDoc) {
      throw new Error("Expected blocks lesson Y.Doc.");
    }
    const blocks = blocksLessonDoc.getMap("lesson").get("blocks");
    expect(blocks).toBeInstanceOf(Y.Array);
    expect((blocks as Y.Array<unknown>).get(0)).toBeInstanceOf(Y.Map);

    const expectedRichTextPaths = new Set<string>();
    const isArrayIndex = (value: string | undefined): boolean =>
      value !== undefined && /^\d+$/u.test(value);
    const isExpectedBlockPayloadRichTextPath = (
      path: readonly string[],
    ): boolean => {
      const lastKey = path.at(-1);
      if (!lastKey) {
        return false;
      }

      if (
        [
          "correctFeedback",
          "heading",
          "html",
          "incorrectFeedback",
          "intro",
          "rationale",
          "subheading",
          "summary",
          "transcript",
        ].includes(lastKey)
      ) {
        return true;
      }

      if (lastKey === "text") {
        return path.length === 1;
      }

      if (lastKey === "prompt") {
        return (
          path.length === 1 ||
          (path[0] === "scenes" &&
            isArrayIndex(path[1]) &&
            path[2] === "prompt")
        );
      }

      if (lastKey === "feedback") {
        return (
          (path[0] === "answers" &&
            isArrayIndex(path[1]) &&
            path.length === 3) ||
          (path[0] === "scenes" &&
            isArrayIndex(path[1]) &&
            path[2] === "choices" &&
            isArrayIndex(path[3]) &&
            path.length === 5)
        );
      }

      return false;
    };
    const isExpectedQuestionRichTextPath = (
      path: readonly string[],
    ): boolean => {
      const lastKey = path.at(-1);
      if (!lastKey) {
        return false;
      }

      if (["prompt", "rationale"].includes(lastKey)) {
        return path.length === 1;
      }

      if (["correct", "incorrect"].includes(lastKey)) {
        return path[0] === "feedback" && path.length === 2;
      }

      if (lastKey === "html") {
        return (
          (path[0] === "answers" &&
            isArrayIndex(path[1]) &&
            path.length === 3) ||
          (path[0] === "items" && isArrayIndex(path[1]) && path.length === 3)
        );
      }

      if (lastKey === "feedback") {
        return (
          path[0] === "answers" && isArrayIndex(path[1]) && path.length === 3
        );
      }

      return false;
    };
    const isExpectedRichTextPath = (path: readonly string[]): boolean => {
      if (path[0] !== "lessons" || !isArrayIndex(path[1])) {
        return false;
      }

      if (
        path[2] === "blocks" &&
        isArrayIndex(path[3]) &&
        path[4] === "payload"
      ) {
        return isExpectedBlockPayloadRichTextPath(path.slice(5));
      }

      if (path[2] === "questions" && isArrayIndex(path[3])) {
        return isExpectedQuestionRichTextPath(path.slice(4));
      }

      return false;
    };
    const collectHtmlStrings = (value: unknown, path: string[]): void => {
      if (typeof value === "string") {
        if (isExpectedRichTextPath(path)) {
          expectedRichTextPaths.add(path.join("."));
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => collectHtmlStrings(item, [...path, String(index)]));
        return;
      }
      if (typeof value === "object" && value !== null) {
        for (const [key, child] of Object.entries(value)) {
          collectHtmlStrings(child, [...path, key]);
        }
      }
    };
    collectHtmlStrings(course.lessons, ["lessons"]);

    expect(new Set(materialized.richTextPaths)).toEqual(expectedRichTextPaths);
    for (const [path, fragment] of materialized.richTextFragments) {
      expect(expectedRichTextPaths.has(path)).toBe(true);
      expect(fragment).toBeInstanceOf(Y.XmlFragment);
    }
    const plainAsidePath = `lessons.${blocksLessonIndex}.blocks.${asideBlockIndex}.payload.text`;
    const plainFeedbackPath = `lessons.${quizLessonIndex}.questions.${multipleChoiceIndex}.feedback.correct`;
    expect(materialized.richTextFragments.get(plainAsidePath)).toBeInstanceOf(
      Y.XmlFragment,
    );
    expect(materialized.richTextFragments.get(plainFeedbackPath)).toBeInstanceOf(
      Y.XmlFragment,
    );
    expect(materialized.richTextFragments.has("labelSet.correct")).toBe(false);

    const roundTripped = roundTripCourseDocThroughYjs(course);

    expect(roundTripped).toEqual(course);
  });

  it("rejects non-representable CRDT payload values", () => {
    const course = validateCourseDoc(loadKitchenSink());
    const invalidCourse = structuredClone(course);
    const blocksLesson = invalidCourse.lessons.find(
      (lesson) => lesson.type === "blocks",
    );
    if (!blocksLesson || blocksLesson.type !== "blocks") {
      throw new Error("Expected blocks lesson in fixture.");
    }
    const firstBlock = blocksLesson.blocks[0];
    if (!firstBlock) {
      throw new Error("Expected at least one block in fixture.");
    }

    firstBlock.payload = {
      html: "<p>Looks serializable until a hidden object appears.</p>",
      unsupported: new Map([["key", "value"]]),
    } as never;

    expect(() => roundTripCourseDocThroughYjs(invalidCourse)).toThrow(
      /Yjs-compatible/,
    );
  });

  it("does not accept unsupported course documents", () => {
    expect(() =>
      courseDocSchema.parse({ schemaVersion: CURRENT_SCHEMA_VERSION, lessons: [] }),
    ).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import type { Block, Lesson } from "@forge/schema";
import { buildCourseIri } from "@forge/schema";
import { compileCourse } from "./compile.js";
import { blockSettings, makeCourse, makeMedia, makeSettings } from "./testutil.js";

const imageBlock = (id: string, mediaId: string): Block =>
  ({
    id,
    family: "image",
    variant: "centered",
    payload: { mediaId, alt: "payload alt", zoomOnClick: false },
    settings: blockSettings,
  }) as Block;

describe("compileCourse", () => {
  it("is deterministic across runs", () => {
    const course = makeCourse({
      media: { m1: makeMedia({ id: "m1", alt: "A logo" }) },
    });
    const a = compileCourse(course, makeSettings());
    const b = compileCourse(course, makeSettings());
    expect(a.courseData).toBe(b.courseData);
    expect(JSON.stringify(a.warnings)).toBe(JSON.stringify(b.warnings));
    expect(JSON.stringify(a.mediaFiles)).toBe(JSON.stringify(b.mediaFiles));
  });

  it("serializes with stable sorted key order", () => {
    const { courseData } = compileCourse(makeCourse(), makeSettings());
    const parsed = JSON.parse(courseData) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual([...Object.keys(parsed)].sort());
    const theme = parsed["theme"] as Record<string, unknown>;
    expect(Object.keys(theme)).toEqual([...Object.keys(theme)].sort());
  });

  it("strips author notes and doc timestamps, embeds settings and activityId", () => {
    const { courseData } = compileCourse(makeCourse(), makeSettings());
    expect(courseData).not.toContain("AUTHOR-ONLY-NOTE");
    expect(courseData).not.toContain('"notes"');
    const parsed = JSON.parse(courseData) as Record<string, unknown>;
    expect(parsed["createdAt"]).toBeUndefined();
    expect(parsed["updatedAt"]).toBeUndefined();
    expect(parsed["activityId"]).toBe(buildCourseIri("01JZ9S99Z8A0Y4Y6RAZ76D9M7F"));
    expect(parsed["publishSettings"]).toEqual({
      tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
      reportingMode: "completed-incomplete",
      exitCourseLink: true,
      hideCoverPage: false,
      strictLaunch: false,
      statementProfile: "forge-v1",
    });
    expect(parsed["labelSet"]).toBeDefined();
    expect(parsed["theme"]).toBeDefined();
    expect(parsed["courseSettings"]).toBeDefined();
  });

  it("honors the iriBase option", () => {
    const { courseData } = compileCourse(makeCourse(), makeSettings(), {
      iriBase: "https://lrs.example.com/base/",
    });
    const parsed = JSON.parse(courseData) as Record<string, unknown>;
    expect(parsed["activityId"]).toBe(
      "https://lrs.example.com/base/courses/01JZ9S99Z8A0Y4Y6RAZ76D9M7F",
    );
  });

  it("rewrites referenced media storage keys to assets/<mediaId><ext>", () => {
    const course = makeCourse({
      media: { hero: makeMedia({ id: "hero", filename: "photo.JPG", alt: "Hero" }) },
    });
    const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
    lesson.blocks.push(imageBlock("block_img", "hero"));
    const { courseData, mediaFiles } = compileCourse(course, makeSettings());
    expect(mediaFiles).toEqual([
      {
        mediaId: "hero",
        packagePath: "assets/hero.JPG",
        storageKey: "courses/test/media/hero.jpg",
      },
    ]);
    const parsed = JSON.parse(courseData) as {
      media: Record<string, { storageKey: string; derived?: unknown }>;
    };
    expect(parsed.media["hero"]?.storageKey).toBe("assets/hero.JPG");
    expect(parsed.media["hero"]?.derived).toBeUndefined();
    expect(courseData).not.toContain("courses/test/media/hero.jpg");
  });

  it("passes data: and url: storage keys through without packaging", () => {
    const course = makeCourse({
      media: {
        inline: makeMedia({
          id: "inline",
          alt: "Inline",
          storageKey: "data:image/png;base64,AAAA",
        }),
        external: makeMedia({
          id: "external",
          alt: "External",
          storageKey: "url:https://example.com/pic.jpg",
        }),
      },
    });
    const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
    lesson.blocks.push(imageBlock("b1", "inline"), imageBlock("b2", "external"));
    const { courseData, mediaFiles } = compileCourse(course, makeSettings());
    expect(mediaFiles).toEqual([]);
    const parsed = JSON.parse(courseData) as {
      media: Record<string, { storageKey: string }>;
    };
    expect(parsed.media["inline"]?.storageKey).toBe("data:image/png;base64,AAAA");
    expect(parsed.media["external"]?.storageKey).toBe(
      "url:https://example.com/pic.jpg",
    );
  });

  it("drops unreferenced media from the published package", () => {
    const course = makeCourse({
      media: { orphan: makeMedia({ id: "orphan", alt: "Orphan" }) },
    });
    const { courseData, mediaFiles } = compileCourse(course, makeSettings());
    expect(mediaFiles).toEqual([]);
    const parsed = JSON.parse(courseData) as { media: Record<string, unknown> };
    expect(parsed.media["orphan"]).toBeUndefined();
  });

  it("warns on broken media references with lesson/block context", () => {
    const course = makeCourse();
    const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
    lesson.blocks.push(imageBlock("block_broken", "missing_media"));
    const { warnings } = compileCourse(course, makeSettings());
    expect(warnings).toContainEqual({
      code: "media_ref_broken",
      message: expect.stringContaining("missing_media") as string,
      lessonId: "lesson_blocks",
      blockId: "block_broken",
    });
  });

  it("warns on image media without alt text", () => {
    const course = makeCourse({
      media: { hero: makeMedia({ id: "hero" }) }, // no MediaRef.alt
    });
    const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
    lesson.blocks.push(imageBlock("block_img", "hero"));
    const { warnings } = compileCourse(course, makeSettings());
    expect(warnings.some((w) => w.code === "image_alt_missing")).toBe(true);
  });

  it("warns on videos without captions", () => {
    const course = makeCourse({
      media: { vid: makeMedia({ id: "vid", kind: "video", filename: "v.mp4" }) },
    });
    const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
    lesson.blocks.push({
      id: "block_video",
      family: "multimedia",
      variant: "video",
      payload: { mediaId: "vid", captions: [] },
      settings: blockSettings,
    } as Block);
    const { warnings } = compileCourse(course, makeSettings());
    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: "video_captions_missing",
        lessonId: "lesson_blocks",
        blockId: "block_video",
      }),
    );
  });

  it("warns on charts without data table label context", () => {
    const course = makeCourse();
    const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
    lesson.blocks.push(
      {
        id: "block_chart_bare",
        family: "chart",
        variant: "bar",
        payload: { items: [{ id: "c1", label: "A", value: 1 }] },
        settings: blockSettings,
      } as Block,
      {
        id: "block_chart_labeled",
        family: "chart",
        variant: "bar",
        payload: {
          items: [{ id: "c2", label: "B", value: 2 }],
          xAxisLabel: "Quarter",
          yAxisLabel: "Revenue",
        },
        settings: blockSettings,
      } as Block,
    );
    const { warnings } = compileCourse(course, makeSettings());
    const chartWarnings = warnings.filter((w) => w.code === "chart_labels_missing");
    expect(chartWarnings).toHaveLength(1);
    expect(chartWarnings[0]?.blockId).toBe("block_chart_bare");
  });

  it("warns on empty lessons", () => {
    const course = makeCourse();
    course.lessons.push({
      type: "blocks",
      id: "lesson_empty",
      title: "Nothing here",
      blocks: [],
    });
    const { warnings } = compileCourse(course, makeSettings());
    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "lesson_empty", lessonId: "lesson_empty" }),
    );
  });

  it("produces no warnings for a clean course", () => {
    const { warnings } = compileCourse(makeCourse(), makeSettings());
    expect(warnings).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { Block, Lesson } from "@forge/schema";
import { buildPackage } from "./package.js";
import { buildZip } from "./zip.js";
import { blockSettings, makeCourse, makeMedia, makeSettings } from "./testutil.js";
import type { PackageFile } from "./types.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const playerAssets: PackageFile[] = [
  { path: "player.abc123.js", data: encoder.encode("// player") },
  { path: "lib/player.abc123.css", data: encoder.encode(":root{}") },
];

function withImage(mediaId: string) {
  const course = makeCourse({
    media: { [mediaId]: makeMedia({ id: mediaId, alt: "An image" }) },
  });
  const lesson = course.lessons[1] as Extract<Lesson, { type: "blocks" }>;
  lesson.blocks.push({
    id: "block_img",
    family: "image",
    variant: "hero",
    payload: { mediaId, alt: "An image", zoomOnClick: false },
    settings: blockSettings,
  } as Block);
  return course;
}

describe("buildPackage", () => {
  it("produces the SPEC 7 package layout", async () => {
    const course = withImage("hero");
    const { files, warnings } = await buildPackage({
      course,
      settings: makeSettings(),
      playerAssets,
      mediaResolver: async () => encoder.encode("image-bytes"),
    });
    const paths = files.map((f) => f.path);
    expect(paths).toEqual([
      "assets/hero.jpg",
      "content/course-data.json",
      "index.html",
      "lib/player.abc123.css",
      "lib/player.abc123.js",
      "tincan.xml",
    ]);
    expect(warnings).toEqual([]);
  });

  it("prefixes bare player asset paths with lib/", async () => {
    const { files } = await buildPackage({
      course: makeCourse(),
      settings: makeSettings(),
      playerAssets: [{ path: "player.js", data: encoder.encode("x") }],
    });
    expect(files.some((f) => f.path === "lib/player.js")).toBe(true);
  });

  it("emits an escaped index.html that passes location.search to the runtime", async () => {
    const course = makeCourse({ title: `Forge & <Friends> "Q" 'A'` });
    const { files } = await buildPackage({
      course,
      settings: makeSettings(),
      playerAssets,
      buildId: "build-42",
    });
    const indexHtml = decoder.decode(
      files.find((f) => f.path === "index.html")?.data,
    );
    expect(indexHtml).toContain(
      "<title>Forge &amp; &lt;Friends&gt; &quot;Q&quot; &apos;A&apos;</title>",
    );
    expect(indexHtml).not.toContain("<Friends>");
    expect(indexHtml).toContain('"courseDataUrl":"content/course-data.json"');
    expect(indexHtml).toContain('"buildId":"build-42"');
    expect(indexHtml).toContain("window.location.search");
    expect(indexHtml).toContain('<script src="lib/player.abc123.js" defer></script>');
    expect(indexHtml).toContain(
      '<link rel="stylesheet" href="lib/player.abc123.css" />',
    );
    expect(indexHtml).toContain('<html lang="en-US">');
  });

  it("warns and skips files for unresolvable media", async () => {
    const course = withImage("hero");
    const { files, warnings } = await buildPackage({
      course,
      settings: makeSettings(),
      playerAssets,
      mediaResolver: async () => null,
    });
    expect(files.some((f) => f.path.startsWith("assets/"))).toBe(false);
    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "media_unresolved" }),
    );
  });

  it("warns for all media when no resolver is provided", async () => {
    const course = withImage("hero");
    const { warnings } = await buildPackage({
      course,
      settings: makeSettings(),
      playerAssets,
    });
    expect(warnings.filter((w) => w.code === "media_unresolved")).toHaveLength(1);
  });

  it("compiles course data into content/course-data.json", async () => {
    const { files } = await buildPackage({
      course: makeCourse(),
      settings: makeSettings(),
      playerAssets,
    });
    const courseData = decoder.decode(
      files.find((f) => f.path === "content/course-data.json")?.data,
    );
    const parsed = JSON.parse(courseData) as Record<string, unknown>;
    expect(parsed["title"]).toBe("Test Course");
    expect(parsed["publishSettings"]).toBeDefined();
  });

  it("package + zip is deterministic end to end", async () => {
    const build = async (): Promise<Uint8Array> => {
      const { files } = await buildPackage({
        course: withImage("hero"),
        settings: makeSettings(),
        playerAssets,
        mediaResolver: async () => encoder.encode("image-bytes"),
        buildId: "stable-build",
      });
      return buildZip(files);
    };
    const first = await build();
    const second = await build();
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });
});

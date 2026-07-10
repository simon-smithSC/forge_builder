import { describe, expect, it } from "vitest";
import type { CourseDoc } from "@forge/schema";
import { defaultLabelSet, defaultTheme } from "@forge/schema";
import { themeStyleOf } from "./chrome.js";

function courseWithSpacing(spacingScale: CourseDoc["theme"]["spacingScale"]): CourseDoc {
  return {
    schemaVersion: "1.3.0",
    id: "course_theme_test",
    title: "Theme test",
    description: "Theme test",
    defaultLocale: "en-US",
    theme: { ...defaultTheme, spacingScale },
    labelSet: defaultLabelSet,
    settings: {
      navigationMode: "free",
      sidebar: { enabled: true, defaultOpen: true },
      searchEnabled: true,
      showLessonCount: true,
      blockEntranceAnimation: "fade",
      videoPlaybackSpeedControl: true,
    },
    lessons: [],
    media: {},
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
  };
}

describe("themeStyleOf", () => {
  it("exposes luminance-derived primary and accent contrast variables", () => {
    const style = themeStyleOf({
      ...courseWithSpacing("comfortable"),
      theme: {
        ...defaultTheme,
        primaryColor: "#f8f8f8",
        accentColor: "#111111",
      },
    });

    expect(style["--forge-primary-contrast" as keyof typeof style]).toBe("#1f2328");
    expect(style["--forge-accent-contrast" as keyof typeof style]).toBe("#ffffff");
  });

  it("maps course spacingScale to shared runtime spacing variables", () => {
    expect(themeStyleOf(courseWithSpacing("compact"))).toMatchObject({
      "--forge-block-spacing": "0.875",
    });
    expect(themeStyleOf(courseWithSpacing("comfortable"))).toMatchObject({
      "--forge-block-spacing": "1",
    });
    expect(themeStyleOf(courseWithSpacing("spacious"))).toMatchObject({
      "--forge-block-spacing": "1.2",
    });
  });
});

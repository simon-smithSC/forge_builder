import type { CSSProperties, ReactElement } from "react";
import { Html } from "@forge/blocks";
import type { CourseDoc } from "@forge/schema";

export interface CoverProps {
  course: CourseDoc;
  lessonCount: number;
  /** True when resume state points at a lesson; swaps the start label. */
  resuming: boolean;
  /** Host media resolution (theme.logoMediaId / cover.mediaId -> URL). */
  resolveMediaUrl: (mediaId: string) => string | undefined;
  onStart: () => void;
}

/**
 * Full-height hero cover (docs/PLAYER-UX-PLAN.md U3): optional theme logo,
 * title in the heading typeface, author, description, lesson count (behind
 * settings.showLessonCount), and a large themed start/resume pill driven by
 * labelSet.startCourse / labelSet.resumeCourse.
 *
 * course.cover (POLISH-PLAN V3.1) adds an optional background image with two
 * layouts: "hero" renders the image above the title inside the column;
 * "cover" paints the whole screen with the image under a dark scrim whose
 * strength comes from overlayOpacity (default 55), switching the text to
 * white via the fp-cover-screen-image modifier.
 */
export function Cover({
  course,
  lessonCount,
  resuming,
  resolveMediaUrl,
  onStart,
}: CoverProps): ReactElement {
  const logoUrl =
    course.theme.logoMediaId !== undefined
      ? resolveMediaUrl(course.theme.logoMediaId)
      : undefined;
  const cover = course.cover;
  const coverUrl =
    cover !== undefined ? resolveMediaUrl(cover.mediaId) : undefined;
  const isFullCover = coverUrl !== undefined && cover?.layout === "cover";
  const isHero = coverUrl !== undefined && cover?.layout === "hero";
  // Fixed pair by design (mirrors the lesson header band): a dark scrim under
  // white text stays readable over any authored image.
  const scrimAlpha = ((cover?.overlayOpacity ?? 55) / 100).toFixed(2);
  const screenStyle: CSSProperties | undefined = isFullCover
    ? {
        backgroundImage: `linear-gradient(rgba(16, 20, 24, ${scrimAlpha}), rgba(16, 20, 24, ${scrimAlpha})), url("${coverUrl}")`,
      }
    : undefined;
  return (
    <div
      className={`fp-cover-screen${isFullCover ? " fp-cover-screen-image" : ""}`}
      style={screenStyle}
    >
      <div className="fp-cover">
        {isHero ? (
          <img className="fp-cover-hero" src={coverUrl} alt="" />
        ) : null}
        {logoUrl !== undefined ? (
          <img className="fp-cover-logo" src={logoUrl} alt="" />
        ) : null}
        <h1 className="fp-cover-title">{course.title}</h1>
        {course.author ? (
          <p className="fp-cover-author">By {course.author}</p>
        ) : null}
        {course.descriptionHtml ? (
          <Html
            fragment={course.descriptionHtml}
            className="fp-cover-description"
          />
        ) : course.description ? (
          <p className="fp-cover-description">{course.description}</p>
        ) : null}
        {course.settings.showLessonCount ? (
          <p className="fp-cover-count">{lessonCount} lessons</p>
        ) : null}
        <button
          type="button"
          className="fp-button fp-button-primary fp-cover-start"
          onClick={onStart}
        >
          {resuming ? course.labelSet.resumeCourse : course.labelSet.startCourse}
        </button>
      </div>
    </div>
  );
}

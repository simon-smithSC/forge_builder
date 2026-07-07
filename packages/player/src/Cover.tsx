import type { ReactElement } from "react";
import type { CourseDoc } from "@forge/schema";

export interface CoverProps {
  course: CourseDoc;
  lessonCount: number;
  /** True when resume state points at a lesson; swaps the start label. */
  resuming: boolean;
  /** Host media resolution (theme.logoMediaId -> displayable URL). */
  resolveMediaUrl: (mediaId: string) => string | undefined;
  onStart: () => void;
}

/**
 * Full-height hero cover (docs/PLAYER-UX-PLAN.md U3): optional theme logo,
 * title in the heading typeface, author, description, lesson count (behind
 * settings.showLessonCount), and a large themed start/resume pill driven by
 * labelSet.startCourse / labelSet.resumeCourse.
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
  return (
    <div className="fp-cover-screen">
      <div className="fp-cover">
        {logoUrl !== undefined ? (
          <img className="fp-cover-logo" src={logoUrl} alt="" />
        ) : null}
        <h1 className="fp-cover-title">{course.title}</h1>
        {course.author ? (
          <p className="fp-cover-author">By {course.author}</p>
        ) : null}
        {course.description ? (
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

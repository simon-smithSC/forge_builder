import type { ReactElement } from "react";
import type { CourseDoc } from "@forge/schema";

export interface CoverProps {
  course: CourseDoc;
  lessonCount: number;
  /** True when resume state points at a lesson; swaps the start label. */
  resuming: boolean;
  onStart: () => void;
}

/** Course cover screen (title, description, start / resume button). */
export function Cover({
  course,
  lessonCount,
  resuming,
  onStart,
}: CoverProps): ReactElement {
  return (
    <div className="fp-cover">
      <h1 className="fp-cover-title">{course.title}</h1>
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
        {resuming ? "Pick up where you left off" : course.labelSet.startCourse}
      </button>
    </div>
  );
}

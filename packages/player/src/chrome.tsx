// Small presentational pieces of the player chrome, split out of Player.tsx
// to keep the orchestrating component readable.

import type { CSSProperties, ReactElement } from "react";
import type { CourseDoc, LabelSet } from "@forge/schema";

export function themeStyleOf(course: CourseDoc): CSSProperties {
  const theme = course.theme;
  return {
    "--forge-primary": theme.primaryColor,
    "--forge-bg": theme.backgroundColor,
    "--forge-surface": theme.surfaceColor,
    "--forge-text": theme.textColor,
    "--forge-accent": theme.accentColor,
    "--forge-heading-font": theme.headingTypeface,
    "--forge-body-font": theme.bodyTypeface,
  } as CSSProperties;
}

/** Dismissible "progress not recorded" notice (untracked preview mode).
 *  Deliberately labelSet-agnostic: untracked launches must never look
 *  localized-complete when the LMS handoff failed. */
export function UntrackedBanner({
  onDismiss,
}: {
  onDismiss: () => void;
}): ReactElement {
  return (
    <div className="fp-untracked-banner" role="status">
      <span>Preview mode - progress is not being recorded</span>
      <button
        type="button"
        className="fp-untracked-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notice"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export interface LessonFooterProps {
  labels: LabelSet;
  previousLessonId: string | undefined;
  nextLessonId: string | undefined;
  /** Sequential navigation with the current lesson incomplete. */
  nextBlocked: boolean;
  onNavigate: (lessonId: string) => void;
}

/** Previous / continue / next lesson controls under the lesson content. */
export function LessonFooter({
  labels,
  previousLessonId,
  nextLessonId,
  nextBlocked,
  onNavigate,
}: LessonFooterProps): ReactElement {
  return (
    <footer className="fp-lesson-footer">
      <button
        type="button"
        className="fp-button"
        disabled={previousLessonId === undefined}
        onClick={() => previousLessonId && onNavigate(previousLessonId)}
      >
        {labels.previousLesson}
      </button>
      {nextLessonId !== undefined ? (
        <button
          type="button"
          className="fp-button fp-button-primary"
          disabled={nextBlocked}
          onClick={() => onNavigate(nextLessonId)}
        >
          {labels.continue}
        </button>
      ) : (
        <span className="fp-lesson-footer-spacer" />
      )}
      <button
        type="button"
        className="fp-button"
        disabled={nextLessonId === undefined || nextBlocked}
        onClick={() => nextLessonId && onNavigate(nextLessonId)}
      >
        {labels.nextLesson}
      </button>
    </footer>
  );
}

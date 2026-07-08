// Small presentational pieces of the player chrome, split out of Player.tsx
// to keep the orchestrating component readable.

import type { CSSProperties, ReactElement, RefObject } from "react";
import type { CourseDoc, LabelSet } from "@forge/schema";
import { fontStackOf, readableTextOn } from "./fonts.js";

export function themeStyleOf(course: CourseDoc): CSSProperties {
  const theme = course.theme;
  return {
    "--forge-primary": theme.primaryColor,
    "--forge-bg": theme.backgroundColor,
    "--forge-surface": theme.surfaceColor,
    "--forge-text": theme.textColor,
    "--forge-accent": theme.accentColor,
    // Luminance-derived foregrounds keep primary/accent surfaces readable
    // for any hex the author picks (U3 contrast audit).
    "--forge-primary-contrast": readableTextOn(theme.primaryColor),
    "--forge-accent-contrast": readableTextOn(theme.accentColor),
    // Bare typeface names become curated stacks (fonts.ts; WOFF2 is U6).
    "--forge-heading-font": fontStackOf(theme.headingTypeface),
    "--forge-body-font": fontStackOf(theme.bodyTypeface),
    "--forge-ui-font": fontStackOf(theme.uiTypeface),
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

export interface PlayerTopbarProps {
  courseTitle: string;
  /** "Lesson n of m" (or "Lesson n" when showLessonCount is off). */
  lessonCounter: string | undefined;
  lessonTitle: string | undefined;
  sidebarEnabled: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  exitLabel: string;
  onExit: (() => void) | undefined;
}

/** Slim top bar: sidebar toggle, course title (desktop) or lesson context
 *  (mobile, CSS-switched), and the labelSet-driven exit link. */
export function PlayerTopbar({
  courseTitle,
  lessonCounter,
  lessonTitle,
  sidebarEnabled,
  sidebarOpen,
  onToggleSidebar,
  exitLabel,
  onExit,
}: PlayerTopbarProps): ReactElement {
  return (
    <header className="fp-topbar">
      {sidebarEnabled ? (
        <button
          type="button"
          className="fp-button fp-topbar-toggle"
          aria-expanded={sidebarOpen}
          aria-controls="fp-sidebar-nav"
          onClick={onToggleSidebar}
        >
          <span aria-hidden="true">&#8801;</span>
          <span className="fp-sr-only">Toggle lesson navigation</span>
        </button>
      ) : null}
      <span className="fp-topbar-title">{courseTitle}</span>
      {lessonTitle !== undefined ? (
        <span className="fp-topbar-context">
          {lessonCounter !== undefined ? (
            <span className="fp-topbar-counter">{lessonCounter}</span>
          ) : null}
          <span className="fp-topbar-lesson">{lessonTitle}</span>
        </span>
      ) : null}
      {onExit ? (
        <button
          type="button"
          className="fp-button fp-topbar-exit"
          onClick={onExit}
        >
          {exitLabel}
        </button>
      ) : null}
    </header>
  );
}

export interface LessonHeaderProps {
  title: string;
  /** "Lesson n of m" line above the title (teardown 236-239). */
  counter: string | undefined;
  author: string | undefined;
  /** Resolved lesson.header.imageMediaId URL; presence switches to the
   *  image band. */
  imageUrl: string | undefined;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

/** Lesson header band: counter, focusable title, author attribution, and an
 *  optional full-bleed lesson.header image background with a readability
 *  scrim. */
export function LessonHeader({
  title,
  counter,
  author,
  imageUrl,
  headingRef,
}: LessonHeaderProps): ReactElement {
  // Fixed pair by design: a dark scrim under white text stays readable over
  // any authored image, independent of the theme palette.
  const style: CSSProperties | undefined = imageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(16, 20, 24, 0.55), rgba(16, 20, 24, 0.55)), url("${imageUrl}")`,
      }
    : undefined;
  return (
    <header
      className={`fp-lesson-header${imageUrl ? " fp-lesson-header-image" : ""}`}
      style={style}
    >
      <div className="fp-lesson-header-inner">
        {counter !== undefined ? (
          <p className="fp-lesson-counter">{counter}</p>
        ) : null}
        <h1 className="fp-lesson-title" tabIndex={-1} ref={headingRef}>
          {title}
        </h1>
        {author !== undefined ? (
          <p className="fp-lesson-author">By {author}</p>
        ) : null}
      </div>
    </header>
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

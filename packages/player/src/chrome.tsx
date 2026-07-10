// Small presentational pieces of the player chrome, split out of Player.tsx
// to keep the orchestrating component readable.

import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement, RefObject } from "react";
import type { CourseDoc, LabelSet } from "@forge/schema";
import { fontStackOf, readableTextOn } from "./fonts.js";

/** Scroll-aware topbar shade (5C.2): true while the given scroll container
 *  has moved off its top. rAF-throttled, implemented locally so the player
 *  stays self-contained (mirrors the editor's useScrolled mechanism without
 *  importing editor code). `active` gates the listener to the lesson view;
 *  the cover screen renders no topbar. */
export function useScrolledFlag(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!active || node === null) {
      setScrolled(false);
      return;
    }
    let frame: number | null = null;
    const update = (): void => {
      frame = null;
      setScrolled(node.scrollTop > 0);
    };
    const onScroll = (): void => {
      if (frame !== null) return;
      frame = requestAnimationFrame(update);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ref, active]);
  return scrolled;
}

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
    "--forge-block-spacing": blockSpacingScale(theme.spacingScale),
    // Bare typeface names become curated stacks (fonts.ts; WOFF2 is U6).
    "--forge-heading-font": fontStackOf(theme.headingTypeface),
    "--forge-body-font": fontStackOf(theme.bodyTypeface),
    "--forge-ui-font": fontStackOf(theme.uiTypeface),
  } as CSSProperties;
}

function blockSpacingScale(
  spacingScale: CourseDoc["theme"]["spacingScale"],
): string {
  switch (spacingScale) {
    case "compact":
      return "0.875";
    case "spacious":
      return "1.2";
    case "comfortable":
      return "1";
  }
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
  /** True while .fp-main is scrolled off its top; fades in the shade. */
  scrolled: boolean;
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
  scrolled,
}: PlayerTopbarProps): ReactElement {
  return (
    <header className="fp-topbar" data-scrolled={scrolled ? "true" : "false"}>
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
  /** lesson.header.backgroundColor: tinted band (color-only) or the layer
   *  behind the image when both are set. */
  backgroundColor: string | undefined;
  /** lesson.header.overlayOpacity (0-100); scrim strength over the image. */
  overlayOpacity: number | undefined;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

/** Lesson header band (POLISH-PLAN V3.3 matrix): counter, focusable title,
 *  author attribution, and an optional full-bleed background. Image only:
 *  dark scrim (authorable opacity, default 55) under fixed white text.
 *  Color only: tinted band with luminance-derived text. Both: the color
 *  paints behind the scrim + image. Neither: plain themed band. */
export function LessonHeader({
  title,
  counter,
  author,
  imageUrl,
  backgroundColor,
  overlayOpacity,
  headingRef,
}: LessonHeaderProps): ReactElement {
  // Fixed scrim hue by design: a dark layer under white text stays readable
  // over any authored image, independent of the theme palette.
  const scrimAlpha = ((overlayOpacity ?? 55) / 100).toFixed(2);
  let style: CSSProperties | undefined;
  if (imageUrl) {
    style = {
      ...(backgroundColor !== undefined ? { backgroundColor } : {}),
      backgroundImage: `linear-gradient(rgba(16, 20, 24, ${scrimAlpha}), rgba(16, 20, 24, ${scrimAlpha})), url("${imageUrl}")`,
    };
  } else if (backgroundColor !== undefined) {
    style = { backgroundColor, color: readableTextOn(backgroundColor) };
  }
  const modifiers = `${
    backgroundColor !== undefined ? " fp-lesson-header-tinted" : ""
  }${imageUrl ? " fp-lesson-header-image" : ""}`;
  return (
    <header className={`fp-lesson-header${modifiers}`} style={style}>
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

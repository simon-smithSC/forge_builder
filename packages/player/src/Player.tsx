import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { BlockRenderContext, BlockView } from "@forge/blocks";
import type { RenderContext } from "@forge/blocks";
import type { CourseDoc, Lesson } from "@forge/schema";
import {
  buildCourseSnapshot,
  computeLessonPercent,
  consumesByInteraction,
} from "./progress.js";
import type { CourseProgressSnapshot } from "./progress.js";
import { QuizLessonView } from "./quiz/QuizLessonView.js";

export interface PlayerProps {
  course: CourseDoc;
  /** Host-specific media resolution; falls back to () => undefined. */
  resolveMediaUrl?: (mediaId: string) => string | undefined;
  initialLessonId?: string;
  hideCover?: boolean;
  onExit?: () => void;
  onProgress?: (snapshot: CourseProgressSnapshot) => void;
}

type NavigableLesson = Exclude<Lesson, { type: "section" }>;

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function isNavigable(lesson: Lesson): lesson is NavigableLesson {
  return lesson.type !== "section";
}

function themeStyleOf(course: CourseDoc): CSSProperties {
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

/** The full runtime UI: cover, sidebar navigation, lesson view, quiz engine. */
export function Player({
  course,
  resolveMediaUrl,
  initialLessonId,
  hideCover,
  onExit,
  onProgress,
}: PlayerProps): ReactElement {
  const navigable = useMemo(
    () => course.lessons.filter(isNavigable),
    [course.lessons],
  );

  const [started, setStarted] = useState(Boolean(hideCover));
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(
    () => initialLessonId ?? navigable[0]?.id,
  );
  const [consumedByLesson, setConsumedByLesson] = useState<
    Record<string, ReadonlySet<string>>
  >({});
  const [sidebarOpen, setSidebarOpen] = useState(
    course.settings.sidebar.defaultOpen,
  );
  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const themeStyle = useMemo(() => themeStyleOf(course), [course]);

  const currentLesson: NavigableLesson | undefined =
    navigable.find((lesson) => lesson.id === currentLessonId) ?? navigable[0];
  const currentConsumed = currentLesson
    ? (consumedByLesson[currentLesson.id] ?? EMPTY_SET)
    : EMPTY_SET;

  const markConsumed = useCallback((lessonId: string, id: string) => {
    setConsumedByLesson((prev) => {
      const existing = prev[lessonId];
      if (existing?.has(id)) return prev;
      const next = new Set(existing ?? []);
      next.add(id);
      return { ...prev, [lessonId]: next };
    });
  }, []);

  // Report a full snapshot to the host after every consumption change.
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    onProgressRef.current?.(buildCourseSnapshot(course.lessons, consumedByLesson));
  }, [course.lessons, consumedByLesson]);

  const isLessonComplete = useCallback(
    (lesson: Lesson): boolean =>
      computeLessonPercent(lesson, consumedByLesson[lesson.id] ?? EMPTY_SET) === 100,
    [consumedByLesson],
  );

  const sequential = course.settings.navigationMode === "sequential";
  const isLockedAt = useCallback(
    (navIndex: number): boolean => {
      if (!sequential) return false;
      for (let i = 0; i < navIndex; i += 1) {
        const lesson = navigable[i];
        if (lesson && !isLessonComplete(lesson)) return true;
      }
      return false;
    },
    [sequential, navigable, isLessonComplete],
  );

  const goToLesson = useCallback(
    (lessonId: string) => {
      const navIndex = navigable.findIndex((lesson) => lesson.id === lessonId);
      if (navIndex === -1 || isLockedAt(navIndex)) return;
      setCurrentLessonId(lessonId);
    },
    [navigable, isLockedAt],
  );

  // Move focus to the lesson heading on lesson change (not on initial mount).
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const lastLessonIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!started || !currentLesson) return;
    if (
      lastLessonIdRef.current !== undefined &&
      lastLessonIdRef.current !== currentLesson.id
    ) {
      mainRef.current?.scrollTo?.(0, 0);
      headingRef.current?.focus();
    }
    lastLessonIdRef.current = currentLesson.id;
  }, [started, currentLesson]);

  // Scroll consumption: every gating block that is not interaction-gated is
  // consumed once ~40% visible (IntersectionObserver on [data-block-id]).
  useEffect(() => {
    if (!started || !currentLesson || currentLesson.type !== "blocks") return;
    const rootEl = mainRef.current;
    if (!rootEl || typeof IntersectionObserver === "undefined") return;
    const lessonId = currentLesson.id;
    const scrollIds = new Set(
      currentLesson.blocks
        .filter((block) => !consumesByInteraction(block))
        .map((block) => block.id),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute("data-block-id");
          if (id && scrollIds.has(id)) {
            observer.unobserve(entry.target);
            markConsumed(lessonId, id);
          }
        }
      },
      { threshold: 0.4 },
    );
    for (const el of Array.from(rootEl.querySelectorAll("[data-block-id]"))) {
      const id = el.getAttribute("data-block-id");
      if (id && scrollIds.has(id)) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [started, currentLesson, markConsumed]);

  const resolveMedia = useMemo(
    () => resolveMediaUrl ?? (() => undefined),
    [resolveMediaUrl],
  );

  const currentLessonIdForEvents = currentLesson?.id;
  const renderContext = useMemo<RenderContext>(
    () => ({
      mode: "player",
      theme: course.theme,
      labels: course.labelSet,
      media: course.media,
      resolveMediaUrl: resolveMedia,
      events: {
        onCompleted: (blockId: string) => {
          if (currentLessonIdForEvents) {
            markConsumed(currentLessonIdForEvents, blockId);
          }
        },
        onNavigateToLesson: goToLesson,
      },
      consumedBlockIds: currentConsumed,
    }),
    [
      course.theme,
      course.labelSet,
      course.media,
      resolveMedia,
      currentLessonIdForEvents,
      currentConsumed,
      markConsumed,
      goToLesson,
    ],
  );

  if (!started) {
    return (
      <div className="fp-player" style={themeStyle}>
        <div className="fp-cover">
          <h1 className="fp-cover-title">{course.title}</h1>
          {course.description ? (
            <p className="fp-cover-description">{course.description}</p>
          ) : null}
          {course.settings.showLessonCount ? (
            <p className="fp-cover-count">{navigable.length} lessons</p>
          ) : null}
          <button
            type="button"
            className="fp-button fp-button-primary fp-cover-start"
            onClick={() => setStarted(true)}
          >
            {course.labelSet.startCourse}
          </button>
        </div>
      </div>
    );
  }

  const navIndex = currentLesson
    ? navigable.findIndex((lesson) => lesson.id === currentLesson.id)
    : -1;
  const previousLesson = navIndex > 0 ? navigable[navIndex - 1] : undefined;
  const nextLesson = navIndex >= 0 ? navigable[navIndex + 1] : undefined;
  const currentComplete = currentLesson ? isLessonComplete(currentLesson) : false;
  const nextBlocked = sequential && !currentComplete;
  const animate =
    course.settings.blockEntranceAnimation !== "none" && !prefersReducedMotion;

  const sidebarEnabled = course.settings.sidebar.enabled;

  return (
    <div className="fp-player" style={themeStyle}>
      <header className="fp-topbar">
        {sidebarEnabled ? (
          <button
            type="button"
            className="fp-button fp-topbar-toggle"
            aria-expanded={sidebarOpen}
            aria-controls="fp-sidebar-nav"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">≡</span>
            <span className="fp-sr-only">Toggle lesson navigation</span>
          </button>
        ) : null}
        <span className="fp-topbar-title">{course.title}</span>
        {onExit ? (
          <button
            type="button"
            className="fp-button fp-topbar-exit"
            onClick={onExit}
          >
            {course.labelSet.exitCourse}
          </button>
        ) : null}
      </header>
      <div className="fp-body">
        {sidebarEnabled && sidebarOpen ? (
          <nav
            id="fp-sidebar-nav"
            className="fp-sidebar"
            aria-label="Lessons"
          >
            <ol className="fp-nav-list">
              {course.lessons.map((lesson) => {
                if (lesson.type === "section") {
                  return (
                    <li key={lesson.id} className="fp-nav-section">
                      {lesson.title}
                    </li>
                  );
                }
                const lessonNavIndex = navigable.findIndex(
                  (navLesson) => navLesson.id === lesson.id,
                );
                const locked = isLockedAt(lessonNavIndex);
                const complete = isLessonComplete(lesson);
                const isCurrent = lesson.id === currentLesson?.id;
                return (
                  <li key={lesson.id} className="fp-nav-item">
                    <button
                      type="button"
                      className={`fp-nav-link${isCurrent ? " fp-nav-current" : ""}${complete ? " fp-nav-complete" : ""}`}
                      disabled={locked}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => goToLesson(lesson.id)}
                    >
                      <span className="fp-nav-status" aria-hidden="true">
                        {complete ? "✓" : locked ? "🔒" : ""}
                      </span>
                      <span className="fp-nav-title">{lesson.title}</span>
                      {locked ? (
                        <span className="fp-sr-only">(locked)</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <main className="fp-main" ref={mainRef}>
          {currentLesson ? (
            <article
              key={currentLesson.id}
              className={`fp-lesson${animate ? " fp-anim-fade" : ""}`}
            >
              <h1 className="fp-lesson-title" tabIndex={-1} ref={headingRef}>
                {currentLesson.title}
              </h1>
              {currentLesson.type === "blocks" ? (
                <BlockRenderContext.Provider value={renderContext}>
                  <div className="fp-lesson-blocks">
                    {currentLesson.blocks.map((block) => (
                      <BlockView key={block.id} block={block} />
                    ))}
                  </div>
                </BlockRenderContext.Provider>
              ) : (
                <QuizLessonView
                  key={`${currentLesson.id}-quiz`}
                  lesson={currentLesson}
                  labels={course.labelSet}
                  onQuestionAnswered={(questionId) =>
                    markConsumed(currentLesson.id, questionId)
                  }
                  onFinished={() => {
                    for (const question of currentLesson.questions) {
                      markConsumed(currentLesson.id, question.id);
                    }
                  }}
                />
              )}
              <footer className="fp-lesson-footer">
                <button
                  type="button"
                  className="fp-button"
                  disabled={!previousLesson}
                  onClick={() => previousLesson && goToLesson(previousLesson.id)}
                >
                  {course.labelSet.previousLesson}
                </button>
                {nextLesson ? (
                  <button
                    type="button"
                    className="fp-button fp-button-primary"
                    disabled={nextBlocked}
                    onClick={() => goToLesson(nextLesson.id)}
                  >
                    {course.labelSet.continue}
                  </button>
                ) : (
                  <span className="fp-lesson-footer-spacer" />
                )}
                <button
                  type="button"
                  className="fp-button"
                  disabled={!nextLesson || nextBlocked}
                  onClick={() => nextLesson && goToLesson(nextLesson.id)}
                >
                  {course.labelSet.nextLesson}
                </button>
              </footer>
            </article>
          ) : (
            <p className="fp-empty">This course has no lessons yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}

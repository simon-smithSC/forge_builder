import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { BlockRenderContext, BlockView } from "@forge/blocks";
import type { RenderContext } from "@forge/blocks";
import type { CourseDoc, Lesson } from "@forge/schema";
// Type-only import: the tracker object arrives via props (R3, SPEC 6).
import type { TrackingPort } from "@forge/xapi";
import { LessonFooter, UntrackedBanner, themeStyleOf } from "./chrome.js";
import { Cover } from "./Cover.js";
import {
  buildCourseSnapshot,
  computeLessonPercent,
  consumesByInteraction,
} from "./progress.js";
import type { CourseProgressSnapshot } from "./progress.js";
import { QuizLessonView } from "./quiz/QuizLessonView.js";
import { SidebarNav } from "./SidebarNav.js";
import {
  usePlayerTracking,
  useStateChangeEmitter,
} from "./tracking.js";
import type {
  CompletedLessonInfo,
  PlayerResume,
  PlayerStateChange,
} from "./tracking.js";

export interface PlayerProps {
  course: CourseDoc;
  /** Host-specific media resolution; falls back to () => undefined. */
  resolveMediaUrl?: (mediaId: string) => string | undefined;
  initialLessonId?: string;
  hideCover?: boolean;
  onExit?: () => void;
  onProgress?: (snapshot: CourseProgressSnapshot) => void;
  /** xAPI tracking port; absent means no tracking calls are made. */
  tracking?: TrackingPort;
  /** Resume state (bookmark, consumed ids, quiz attempts) from the host. */
  resume?: PlayerResume;
  /** Debounced (~1s) bookmark + consumption report for State API writes. */
  onStateChange?: (state: PlayerStateChange) => void;
  /** Shows a dismissible "progress not recorded" banner (untracked mode). */
  untrackedBanner?: boolean;
}

type NavigableLesson = Exclude<Lesson, { type: "section" }>;

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

function isNavigable(lesson: Lesson): lesson is NavigableLesson {
  return lesson.type !== "section";
}

/** The full runtime UI: cover, sidebar navigation, lesson view, quiz engine. */
export function Player({
  course,
  resolveMediaUrl,
  initialLessonId,
  hideCover,
  onExit,
  onProgress,
  tracking,
  resume,
  onStateChange,
  untrackedBanner,
}: PlayerProps): ReactElement {
  const navigable = useMemo(
    () => course.lessons.filter(isNavigable),
    [course.lessons],
  );

  const [started, setStarted] = useState(Boolean(hideCover));
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(
    () => resume?.lessonId ?? initialLessonId ?? navigable[0]?.id,
  );
  const [consumedByLesson, setConsumedByLesson] = useState<
    Record<string, ReadonlySet<string>>
  >(() => {
    const seeded: Record<string, ReadonlySet<string>> = {};
    for (const [lessonId, ids] of Object.entries(
      resume?.consumedByLesson ?? {},
    )) {
      seeded[lessonId] = new Set(ids);
    }
    return seeded;
  });
  const [sidebarOpen, setSidebarOpen] = useState(
    course.settings.sidebar.defaultOpen,
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
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

  // Full snapshot after every consumption change (host + tracking hooks).
  const snapshot = useMemo(
    () => buildCourseSnapshot(course.lessons, consumedByLesson),
    [course.lessons, consumedByLesson],
  );
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    onProgressRef.current?.(snapshot);
  }, [snapshot]);

  const isLessonComplete = useCallback(
    (lesson: Lesson): boolean =>
      computeLessonPercent(lesson, consumedByLesson[lesson.id] ?? EMPTY_SET) === 100,
    [consumedByLesson],
  );

  // --- R3 tracking + resume wiring -------------------------------------
  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;

  const completedLessons = useMemo<CompletedLessonInfo[]>(
    () =>
      navigable
        .filter((lesson) => snapshot.lessons[lesson.id]?.completed === true)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          isQuiz: lesson.type === "quiz",
        })),
    [navigable, snapshot],
  );

  // Lessons complete at mount (resume) never re-announce lessonCompleted.
  const initiallyCompletedRef = useRef<string[] | null>(null);
  if (initiallyCompletedRef.current === null) {
    initiallyCompletedRef.current = navigable
      .filter(
        (lesson) =>
          computeLessonPercent(
            lesson,
            consumedByLesson[lesson.id] ?? EMPTY_SET,
          ) === 100,
      )
      .map((lesson) => lesson.id);
  }

  usePlayerTracking({
    tracking,
    started,
    currentLesson,
    percent: snapshot.percent,
    completedLessons,
    initiallyCompletedLessonIds: initiallyCompletedRef.current,
  });
  useStateChangeEmitter(onStateChange, currentLesson?.id, consumedByLesson);
  // ----------------------------------------------------------------------

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
        onInteracted: (blockId: string, detail?: Record<string, unknown>) => {
          // Scenario renderers report {sceneId, choiceId}; other families
          // send different detail shapes which are not tracked.
          const sceneId = detail?.["sceneId"];
          const choiceId = detail?.["choiceId"];
          if (typeof sceneId === "string" && typeof choiceId === "string") {
            trackingRef.current?.scenarioChoice(blockId, sceneId, choiceId);
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

  const banner =
    untrackedBanner && !bannerDismissed ? (
      <UntrackedBanner onDismiss={() => setBannerDismissed(true)} />
    ) : null;

  if (!started) {
    return (
      <div className="fp-player" style={themeStyle}>
        {banner}
        <Cover
          course={course}
          lessonCount={navigable.length}
          resuming={resume?.lessonId !== undefined}
          onStart={() => setStarted(true)}
        />
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
  const navigableIds = navigable.map((lesson) => lesson.id);

  return (
    <div className="fp-player" style={themeStyle}>
      {banner}
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
          <SidebarNav
            lessons={course.lessons}
            navigableIds={navigableIds}
            currentLessonId={currentLesson?.id}
            isLocked={isLockedAt}
            isComplete={isLessonComplete}
            onSelect={goToLesson}
          />
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
                  initialAttempt={
                    (resume?.quizAttempts?.[currentLesson.id] ?? 0) + 1
                  }
                  onQuestionAnswered={(questionId) =>
                    markConsumed(currentLesson.id, questionId)
                  }
                  onQuestionSubmitted={(input) =>
                    trackingRef.current?.questionAnswered(input)
                  }
                  onQuizResult={(score, passed, attemptsExhausted) =>
                    trackingRef.current?.quizSubmitted(
                      currentLesson.id,
                      currentLesson.title,
                      score,
                      passed,
                      attemptsExhausted,
                    )
                  }
                  onFinished={() => {
                    for (const question of currentLesson.questions) {
                      markConsumed(currentLesson.id, question.id);
                    }
                  }}
                />
              )}
              <LessonFooter
                labels={course.labelSet}
                previousLessonId={previousLesson?.id}
                nextLessonId={nextLesson?.id}
                nextBlocked={nextBlocked}
                onNavigate={goToLesson}
              />
            </article>
          ) : (
            <p className="fp-empty">This course has no lessons yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}

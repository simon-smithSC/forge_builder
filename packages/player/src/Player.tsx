import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { BlockRenderContext, BlockView } from "@forge/blocks";
import type { RenderContext } from "@forge/blocks";
import type { CourseDoc, Lesson } from "@forge/schema";
// Type-only import: the tracker object arrives via props (R3, SPEC 6).
import type { TrackingPort } from "@forge/xapi";
import {
  LessonFooter,
  LessonHeader,
  PlayerTopbar,
  UntrackedBanner,
  themeStyleOf,
} from "./chrome.js";
import { Cover } from "./Cover.js";
import { resolveEntranceKind } from "./entrance.js";
import { useBatchStagger, useContinueReveal } from "./lessonReveal.js";
import { PlayerBlock } from "./PlayerBlock.js";
import {
  buildCourseSnapshot,
  computeLessonPercent,
  consumesByInteraction,
  visibleBlocks,
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

/** Breakpoint at which the sidebar becomes an overlay drawer (U4). */
const MOBILE_QUERY = "(max-width: 768px)";

function isMobileViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_QUERY).matches
  );
}

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
  // defaultOpen governs the desktop initial state; the mobile drawer always
  // starts closed (it overlays the lesson).
  const [sidebarOpen, setSidebarOpen] = useState(
    () => course.settings.sidebar.defaultOpen && !isMobileViewport(),
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

  // Sidebar selection also dismisses the mobile overlay drawer (U4).
  const selectFromSidebar = useCallback(
    (lessonId: string) => {
      goToLesson(lessonId);
      if (isMobileViewport()) setSidebarOpen(false);
    },
    [goToLesson],
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

  // U2 progressive reveal: only blocks up to the first unconsumed continue
  // divider mount; consuming a gate (divider.tsx -> onCompleted ->
  // markConsumed) grows this list, which re-renders and re-observes.
  const shownBlocks = useMemo(
    () =>
      currentLesson && currentLesson.type === "blocks"
        ? visibleBlocks(currentLesson, currentConsumed)
        : [],
    [currentLesson, currentConsumed],
  );
  // Stable identity for the rendered set: effects re-run only when the set
  // of mounted blocks changes, not on every consumption.
  const shownIdsKey = shownBlocks.map((block) => block.id).join("\n");

  // Scroll consumption: every gating block that is not interaction-gated is
  // consumed once ~40% visible (IntersectionObserver on [data-block-id]).
  // shownIdsKey re-attaches the observer when a continue reveal mounts new
  // [data-block-id] nodes; the DOM query below only ever finds rendered ones.
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
  }, [started, currentLesson, markConsumed, shownIdsKey]);

  // Continue reveal (U2): when the visible set grows within a lesson, smooth
  // scroll to the first newly mounted block (auto under reduced motion) and
  // announce "Continued" politely, matching Rise. Stagger indexes reset per
  // revealing batch (Rise --idx semantics).
  const revealAnnouncement = useContinueReveal({
    started,
    lessonId: currentLesson?.id,
    shownIdsKey,
    prefersReducedMotion,
    mainRef,
  });
  const staggerIndexFor = useBatchStagger(currentLesson?.id);

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
      // U5: the multimedia video renderer hides the playback speed menu
      // (controlsList="noplaybackrate") when this course setting is false.
      videoPlaybackSpeedControl: course.settings.videoPlaybackSpeedControl,
    }),
    [
      course.theme,
      course.labelSet,
      course.media,
      course.settings.videoPlaybackSpeedControl,
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
          resolveMediaUrl={resolveMedia}
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
  const courseEntrance = course.settings.blockEntranceAnimation;

  const sidebarEnabled = course.settings.sidebar.enabled;
  const navigableIds = navigable.map((lesson) => lesson.id);

  // "Lesson n of m" (teardown 236-239); showLessonCount hides the total.
  const lessonCounter =
    navIndex >= 0
      ? course.settings.showLessonCount
        ? `Lesson ${navIndex + 1} of ${navigable.length}`
        : `Lesson ${navIndex + 1}`
      : undefined;
  const headerImageUrl =
    currentLesson &&
    currentLesson.type === "blocks" &&
    currentLesson.headerImage !== undefined
      ? resolveMedia(currentLesson.headerImage)
      : undefined;

  return (
    <div className="fp-player" style={themeStyle}>
      {banner}
      <PlayerTopbar
        courseTitle={course.title}
        lessonCounter={lessonCounter}
        lessonTitle={currentLesson?.title}
        sidebarEnabled={sidebarEnabled}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        exitLabel={course.labelSet.exitCourse}
        onExit={onExit}
      />
      <div className="fp-body">
        {sidebarEnabled && sidebarOpen ? (
          <>
            {/* Mobile-only scrim (display: none on desktop); the hamburger
                stays the keyboard-operable close control. */}
            <div
              className="fp-sidebar-backdrop"
              aria-hidden="true"
              onClick={() => setSidebarOpen(false)}
            />
            <SidebarNav
              courseTitle={course.title}
              percentComplete={snapshot.percent}
              lessons={course.lessons}
              navigableIds={navigableIds}
              currentLessonId={currentLesson?.id}
              searchEnabled={course.settings.searchEnabled}
              searchPlaceholder={course.labelSet.searchPlaceholder}
              isLocked={isLockedAt}
              isComplete={isLessonComplete}
              onSelect={selectFromSidebar}
            />
          </>
        ) : null}
        <main className="fp-main" ref={mainRef}>
          {/* Rise announces "Continued" on gate reveal via a hidden region. */}
          <div className="fp-sr-only" role="status" aria-live="polite">
            {revealAnnouncement}
          </div>
          {currentLesson ? (
            <article key={currentLesson.id} className="fp-lesson-article">
              <LessonHeader
                title={currentLesson.title}
                counter={lessonCounter}
                author={course.author}
                imageUrl={headerImageUrl}
                headingRef={headingRef}
              />
              <div className="fp-lesson">
              {currentLesson.type === "blocks" ? (
                <BlockRenderContext.Provider value={renderContext}>
                  <div className="fp-lesson-blocks">
                    {shownBlocks.map((block) => (
                      <PlayerBlock
                        key={block.id}
                        kind={
                          prefersReducedMotion
                            ? "none"
                            : resolveEntranceKind(
                                courseEntrance,
                                block.settings.entranceAnimation,
                              )
                        }
                        staggerIndex={staggerIndexFor(block.id)}
                        initiallyVisible={currentConsumed.has(block.id)}
                      >
                        <BlockView block={block} />
                      </PlayerBlock>
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
              </div>
            </article>
          ) : (
            <p className="fp-empty">This course has no lessons yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}

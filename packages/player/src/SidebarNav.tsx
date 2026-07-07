import type { ReactElement } from "react";
import type { Lesson } from "@forge/schema";

export interface SidebarNavProps {
  lessons: readonly Lesson[];
  /** Ids of navigable (non-section) lessons in course order. */
  navigableIds: readonly string[];
  currentLessonId: string | undefined;
  isLocked: (navIndex: number) => boolean;
  isComplete: (lesson: Lesson) => boolean;
  onSelect: (lessonId: string) => void;
}

/** Lesson navigation sidebar (sections as headers, lessons as buttons). */
export function SidebarNav({
  lessons,
  navigableIds,
  currentLessonId,
  isLocked,
  isComplete,
  onSelect,
}: SidebarNavProps): ReactElement {
  return (
    <nav id="fp-sidebar-nav" className="fp-sidebar" aria-label="Lessons">
      <ol className="fp-nav-list">
        {lessons.map((lesson) => {
          if (lesson.type === "section") {
            return (
              <li key={lesson.id} className="fp-nav-section">
                {lesson.title}
              </li>
            );
          }
          const navIndex = navigableIds.indexOf(lesson.id);
          const locked = isLocked(navIndex);
          const complete = isComplete(lesson);
          const isCurrent = lesson.id === currentLessonId;
          return (
            <li key={lesson.id} className="fp-nav-item">
              <button
                type="button"
                className={`fp-nav-link${isCurrent ? " fp-nav-current" : ""}${complete ? " fp-nav-complete" : ""}`}
                disabled={locked}
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => onSelect(lesson.id)}
              >
                <span className="fp-nav-status" aria-hidden="true">
                  {complete ? "✓" : locked ? "🔒" : ""}
                </span>
                <span className="fp-nav-title">{lesson.title}</span>
                {locked ? <span className="fp-sr-only">(locked)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

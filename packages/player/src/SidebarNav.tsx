import { useState } from "react";
import type { ReactElement } from "react";
import type { Lesson } from "@forge/schema";

export interface SidebarNavProps {
  courseTitle: string;
  /** Course progress snapshot percent (Player owns the snapshot). */
  percentComplete: number;
  lessons: readonly Lesson[];
  /** Ids of navigable (non-section) lessons in course order. */
  navigableIds: readonly string[];
  currentLessonId: string | undefined;
  /** settings.searchEnabled: shows the client-side title filter. */
  searchEnabled: boolean;
  searchPlaceholder: string;
  isLocked: (navIndex: number) => boolean;
  isComplete: (lesson: Lesson) => boolean;
  onSelect: (lessonId: string) => void;
}

function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M3.2 8.6 6.6 12 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="3.6" y="7" width="8.8" height="6.2" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function DotIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/**
 * Sidebar chrome (docs/PLAYER-UX-PLAN.md U4): course title, live
 * "% COMPLETE" line with a progress track, optional title search, section
 * group labels, and numbered lesson rows with state icons (check when
 * complete, lock when sequentially locked, hollow dot otherwise).
 */
export function SidebarNav({
  courseTitle,
  percentComplete,
  lessons,
  navigableIds,
  currentLessonId,
  searchEnabled,
  searchPlaceholder,
  isLocked,
  isComplete,
  onSelect,
}: SidebarNavProps): ReactElement {
  const [query, setQuery] = useState("");
  const filter = query.trim().toLowerCase();
  return (
    <nav id="fp-sidebar-nav" className="fp-sidebar" aria-label="Lessons">
      <div className="fp-sidebar-header">
        <p className="fp-sidebar-course">{courseTitle}</p>
        <p className="fp-sidebar-progress-text">{percentComplete}% complete</p>
        <div className="fp-sidebar-progress-track" aria-hidden="true">
          <div
            className="fp-sidebar-progress-runner"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        {searchEnabled ? (
          <input
            type="search"
            className="fp-sidebar-search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}
      </div>
      <ol className="fp-nav-list">
        {lessons.map((lesson) => {
          if (lesson.type === "section") {
            // Group labels drop out while filtering (results only).
            if (filter !== "") return null;
            return (
              <li key={lesson.id} className="fp-nav-section">
                {lesson.title}
              </li>
            );
          }
          if (filter !== "" && !lesson.title.toLowerCase().includes(filter)) {
            return null;
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
                <span className="fp-nav-num" aria-hidden="true">
                  {navIndex + 1}
                </span>
                <span className="fp-nav-title">{lesson.title}</span>
                <span className="fp-nav-status" aria-hidden="true">
                  {complete ? <CheckIcon /> : locked ? <LockIcon /> : <DotIcon />}
                </span>
                {locked ? <span className="fp-sr-only">(locked)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

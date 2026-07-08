import type { ReactElement } from "react";
import { Button, EmptyState, Icon, Skeleton, Wordmark } from "@forge/ui";
import { useCourseOpener, useCoursesQuery } from "../state/courseQueries.js";
import { useStore } from "../state/store.js";
import { ThemeToggle } from "./ThemeToggle.js";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Loading placeholder matching the .fe-course-card geometry (5A.6). */
function SkeletonCards(): ReactElement {
  return (
    <>
      <span className="fe-sr-only" role="status">
        Loading courses
      </span>
      <div className="fe-course-grid" aria-hidden>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="fe-course-card fe-course-card-skeleton">
            <Skeleton variant="text" width="70%" height="1.25rem" />
            <Skeleton variant="text" width="40%" height="0.75rem" />
            <Skeleton variant="text" width="55%" height="0.75rem" />
          </div>
        ))}
      </div>
    </>
  );
}

export function CourseList(): ReactElement {
  const coursesQuery = useCoursesQuery();
  const opener = useCourseOpener();
  // busy covers the open/create actions, which still run through the
  // store-backed lifecycle (journal restore check included); their failures
  // surface as toasts from courseLifecycle (5A.6).
  const busy = useStore((state) => state.busy);

  const courses = coursesQuery.data ?? [];
  const listError = coursesQuery.isError
    ? (coursesQuery.error.message || "Failed to load courses.")
    : null;

  return (
    <div className="fe-course-list">
      <header className="fe-course-list-header">
        <h1 className="fe-course-list-brand">
          <Wordmark withText />
        </h1>
        <span className="fe-course-list-actions">
          <ThemeToggle />
          <Button
            variant="primary"
            iconStart={<Icon name="plus" size={16} />}
            onClick={() => void opener.create()}
            disabled={busy}
          >
            New course
          </Button>
        </span>
      </header>

      {listError ? (
        <p className="fe-error" role="alert">
          {listError}{" "}
          <Button
            size="sm"
            onClick={() => void coursesQuery.refetch()}
            disabled={coursesQuery.isFetching}
          >
            Retry
          </Button>
        </p>
      ) : null}

      {coursesQuery.isPending ? <SkeletonCards /> : null}

      {coursesQuery.isSuccess && courses.length === 0 ? (
        <EmptyState
          icon={<Icon name="book-open" size={24} />}
          title="No courses yet"
          description="Create your first course to get started."
          action={
            <Button
              variant="primary"
              iconStart={<Icon name="plus" size={16} />}
              onClick={() => void opener.create()}
              disabled={busy}
            >
              New course
            </Button>
          }
        />
      ) : null}

      <div className="fe-course-grid">
        {courses.map((course) => (
          <button
            key={course.id}
            type="button"
            className="fe-course-card"
            onClick={() => void opener.open(course.id)}
          >
            <span className="fe-course-card-title">{course.title}</span>
            <span className="fe-course-card-meta fe-course-card-lessons">
              <Icon name="book-open" size={14} />
              {course.lessonCount}{" "}
              {course.lessonCount === 1 ? "lesson" : "lessons"}
            </span>
            <span className="fe-course-card-meta">
              Updated {formatDate(course.updatedAt)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

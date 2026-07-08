import type { ReactElement } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button, EmptyState } from "@forge/ui";
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

export function CourseList(): ReactElement {
  const coursesQuery = useCoursesQuery();
  const opener = useCourseOpener();
  // busy/loadError cover the open/create actions, which still run through
  // the store-backed lifecycle (journal restore check included).
  const busy = useStore((state) => state.busy);
  const actionError = useStore((state) => state.loadError);

  const courses = coursesQuery.data ?? [];
  const listError = coursesQuery.isError
    ? (coursesQuery.error.message || "Failed to load courses.")
    : null;

  return (
    <div className="fe-course-list">
      <header className="fe-course-list-header">
        <h1>Forge</h1>
        <span className="fe-course-list-actions">
          <ThemeToggle />
          <Button
            variant="primary"
            iconStart={<Plus size={16} aria-hidden />}
            onClick={() => void opener.create()}
            disabled={busy}
          >
            New course
          </Button>
        </span>
      </header>

      {actionError ? (
        <p className="fe-error" role="alert">
          {actionError}
        </p>
      ) : null}

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

      {coursesQuery.isPending ? (
        <p className="fe-muted">Loading courses...</p>
      ) : null}

      {coursesQuery.isSuccess && courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} aria-hidden />}
          title="No courses yet"
          description="Create your first course to get started."
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
            <span className="fe-course-card-meta">
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

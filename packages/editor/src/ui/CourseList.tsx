import type { ReactElement } from "react";
import { BookOpen, Plus } from "lucide-react";
import { useCourseOpener, useCoursesQuery } from "../state/courseQueries.js";
import { useStore } from "../state/store.js";

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
        <button
          type="button"
          className="fe-btn fe-btn-primary"
          onClick={() => void opener.create()}
          disabled={busy}
        >
          <Plus size={16} aria-hidden />
          New course
        </button>
      </header>

      {actionError ? (
        <p className="fe-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {listError ? (
        <p className="fe-error" role="alert">
          {listError}{" "}
          <button
            type="button"
            className="fe-btn"
            onClick={() => void coursesQuery.refetch()}
            disabled={coursesQuery.isFetching}
          >
            Retry
          </button>
        </p>
      ) : null}

      {coursesQuery.isPending ? (
        <p className="fe-muted">Loading courses...</p>
      ) : null}

      {coursesQuery.isSuccess && courses.length === 0 ? (
        <div className="fe-empty">
          <BookOpen size={32} aria-hidden />
          <p>No courses yet. Create your first course to get started.</p>
        </div>
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

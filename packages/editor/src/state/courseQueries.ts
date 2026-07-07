// Course READ queries per ADR 0002. TanStack Query owns list fetching and
// caching; opening/creating a course stays on the courseLifecycle actions so
// the journal restore check, history reset, and store wiring keep working.
// The autosave/journal WRITE path (persistence.ts) is untouched.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import * as api from "../api/client.js";
import { createNewCourse, openCourse } from "./courseLifecycle.js";
import type { CourseSummary } from "./store.js";

export const coursesQueryKey = ["courses"] as const;

function toSummary(item: api.RevisionedCourse): CourseSummary {
  return {
    id: item.data.id,
    title: item.data.title,
    lessonCount: item.data.lessons.length,
    updatedAt: item.data.updatedAt,
    revision: item.revision,
  };
}

async function fetchCourseSummaries(): Promise<CourseSummary[]> {
  const courses = await api.listCourses();
  return courses.map(toSummary);
}

/** Course list over api.listCourses. Refetches on every mount so returning
 * from the editor (closeCourse) shows fresh titles/timestamps even within
 * the staleTime window. */
export function useCoursesQuery(): UseQueryResult<CourseSummary[], Error> {
  return useQuery({
    queryKey: coursesQueryKey,
    queryFn: fetchCourseSummaries,
    refetchOnMount: "always",
  });
}

export interface CourseOpener {
  /** Open an existing course via the lifecycle action (journal restore
   * check, history reset, revision tracking all included). */
  open: (courseId: string) => Promise<void>;
  /** Create a course via the existing action, then invalidate the list so
   * the next visit refetches. */
  create: () => Promise<void>;
}

export function useCourseOpener(): CourseOpener {
  const client = useQueryClient();
  return {
    open: async (courseId: string) => {
      await openCourse(courseId);
    },
    create: async () => {
      await createNewCourse();
      await client.invalidateQueries({ queryKey: coursesQueryKey });
    },
  };
}

import { buildCourseIri, buildInteractionIri, buildLessonIri } from "@forge/schema";

/**
 * IRI construction for tincan.xml and course-data.json.
 *
 * When no iriBase override is given we delegate to the @forge/schema
 * builders so the course activity id in tincan.xml is byte-identical to
 * the IRIs the runtime puts in statements (SPEC section 6.2: the course
 * IRI doubles as the tincan activity_id and must stay constant across
 * republish).
 */
export interface IriBuilders {
  course(courseId: string): string;
  lesson(courseId: string, lessonId: string): string;
  interaction(courseId: string, questionId: string): string;
}

const segment = (value: string): string => {
  if (value.length === 0) {
    throw new Error("IRI path segments must be non-empty.");
  }
  return encodeURIComponent(value);
};

export function createIriBuilders(iriBase?: string): IriBuilders {
  if (iriBase === undefined) {
    return {
      course: buildCourseIri,
      lesson: buildLessonIri,
      interaction: buildInteractionIri,
    };
  }
  const base = iriBase.replace(/\/+$/, "");
  if (base.length === 0) {
    throw new Error("iriBase must be a non-empty URL prefix.");
  }
  return {
    course: (courseId) => `${base}/courses/${segment(courseId)}`,
    lesson: (courseId, lessonId) =>
      `${base}/courses/${segment(courseId)}/lessons/${segment(lessonId)}`,
    interaction: (courseId, questionId) =>
      `${base}/courses/${segment(courseId)}/interactions/${segment(questionId)}`,
  };
}

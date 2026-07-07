const XAPI_IRI_BASE = "https://xapi.supercell.com";

const segment = (value: string): string => {
  if (value.length === 0) {
    throw new Error("IRI path segments must be non-empty.");
  }
  return encodeURIComponent(value);
};

export function buildCourseIri(courseId: string): string {
  return `${XAPI_IRI_BASE}/courses/${segment(courseId)}`;
}

export function buildLessonIri(courseId: string, lessonId: string): string {
  return `${buildCourseIri(courseId)}/lessons/${segment(lessonId)}`;
}

export function buildBlockIri(
  courseId: string,
  lessonId: string,
  blockId: string,
): string {
  return `${buildLessonIri(courseId, lessonId)}/blocks/${segment(blockId)}`;
}

export function buildInteractionIri(courseId: string, questionId: string): string {
  return `${buildCourseIri(courseId)}/interactions/${segment(questionId)}`;
}

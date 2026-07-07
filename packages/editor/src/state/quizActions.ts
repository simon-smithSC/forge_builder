// R2 quiz lesson actions: pure mutations over the selected quiz lesson plus
// dispatch wrappers following the state/actions.ts conventions (history
// snapshot, dirty-lesson mark, debounced save). Every wrapper validates the
// resulting lesson against the schema and, when invalid, returns the zod
// message INSTEAD of committing; callers surface that message inline.
import type { CourseDoc, Question, QuizLesson } from "@forge/schema";
import { createUlid, lessonSchema } from "@forge/schema";
import * as history from "./history.js";
import { markLessonDirty, scheduleSave } from "./persistence.js";
import { editorStore } from "./store.js";

export type QuizSettings = QuizLesson["settings"];
export type QuestionType = Question["type"];

// ---- pure helpers ----

function zodMessage(error: unknown): string {
  const issues = (
    error as { issues?: { path?: (string | number)[]; message?: string }[] }
  ).issues;
  const first = issues?.[0];
  if (first?.message) {
    const path = (first.path ?? []).join(".");
    return path ? `${path}: ${first.message}` : first.message;
  }
  return error instanceof Error ? error.message : "Invalid value.";
}

/** Deep clone a value, regenerating every property literally named "id". */
function cloneWithFreshIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneWithFreshIds);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] =
        key === "id" && typeof item === "string"
          ? createUlid()
          : cloneWithFreshIds(item);
    }
    return out;
  }
  return value;
}

/** Copy of a question with fresh ULIDs for the question and all nested items. */
export function duplicateQuestionValue(question: Question): Question {
  return cloneWithFreshIds(question) as Question;
}

const LIKERT_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
] as const;

/** Schema-valid default question for each of the seven types. */
export function createDefaultQuestion(type: QuestionType): Question {
  const id = createUlid();
  switch (type) {
    case "MULTIPLE_CHOICE":
      return {
        type,
        id,
        prompt: "<p>New question</p>",
        answers: [1, 2, 3, 4].map((n) => ({
          id: createUlid(),
          html: `<p>Answer ${n}</p>`,
          correct: n === 1,
        })),
      };
    case "MULTIPLE_RESPONSE":
      return {
        type,
        id,
        prompt: "<p>New question</p>",
        answers: [1, 2, 3, 4].map((n) => ({
          id: createUlid(),
          html: `<p>Answer ${n}</p>`,
          correct: n === 1,
        })),
      };
    case "FILL_IN_THE_BLANK":
      return {
        type,
        id,
        prompt: "<p>New question</p>",
        acceptedAnswers: [{ id: createUlid(), value: "Answer" }],
        caseSensitive: false,
      };
    case "MATCHING":
      return {
        type,
        id,
        prompt: "<p>New question</p>",
        pairs: [1, 2, 3].map((n) => ({
          id: createUlid(),
          prompt: `Prompt ${n}`,
          match: `Match ${n}`,
        })),
      };
    case "SEQUENCING":
      return {
        type,
        id,
        prompt: "<p>New question</p>",
        items: [0, 1, 2].map((index) => ({
          id: createUlid(),
          html: `<p>Step ${index + 1}</p>`,
          correctOrder: index,
        })),
      };
    case "NUMERIC":
      return {
        type,
        id,
        prompt: "<p>New question</p>",
        grading: { mode: "exact", value: 0 },
      };
    case "LIKERT":
      return {
        type,
        id,
        prompt: "<p>New statement</p>",
        scale: LIKERT_LABELS.map((label, index) => ({
          id: createUlid(),
          label,
          value: index + 1,
        })),
        required: true,
      };
  }
}

function mapQuizLesson(
  course: CourseDoc,
  lessonId: string,
  fn: (lesson: QuizLesson) => QuizLesson,
): CourseDoc {
  let changed = false;
  const lessons = course.lessons.map((lesson) => {
    if (lesson.id !== lessonId || lesson.type !== "quiz") return lesson;
    const next = fn(lesson);
    if (next !== lesson) changed = true;
    return next;
  });
  if (!changed) return course;
  return { ...course, lessons, updatedAt: new Date().toISOString() };
}

// ---- dispatch core ----

/**
 * Apply a pure mutation to the quiz lesson. Validates the whole resulting
 * lesson via the schema; on success pushes an undo snapshot, commits to the
 * store, marks the lesson dirty for autosave, and returns null. On zod
 * failure nothing is committed and the message is returned for inline display.
 */
function commitQuizMutation(
  lessonId: string,
  fn: (lesson: QuizLesson) => QuizLesson,
): string | null {
  const state = editorStore.getState();
  const course = state.course;
  if (!course) return null;
  const next = mapQuizLesson(course, lessonId, fn);
  if (next === course) return null;
  const nextLesson = next.lessons.find((lesson) => lesson.id === lessonId);
  const parsed = lessonSchema.safeParse(nextLesson);
  if (!parsed.success) return zodMessage(parsed.error);
  history.pushSnapshot(course);
  editorStore.setState((prev) => ({
    ...prev,
    course: next,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  }));
  markLessonDirty(lessonId);
  scheduleSave();
  return null;
}

// ---- quiz actions ----

export function setQuizSettings(
  lessonId: string,
  settings: QuizSettings,
): string | null {
  return commitQuizMutation(lessonId, (lesson) => ({ ...lesson, settings }));
}

export function updateQuestion(
  lessonId: string,
  questionId: string,
  question: Question,
): string | null {
  return commitQuizMutation(lessonId, (lesson) => {
    const index = lesson.questions.findIndex((q) => q.id === questionId);
    if (index < 0) return lesson;
    const questions = [...lesson.questions];
    questions[index] = question;
    return { ...lesson, questions };
  });
}

export function addQuestion(
  lessonId: string,
  type: QuestionType,
): { error: string | null; questionId: string } {
  const question = createDefaultQuestion(type);
  const error = commitQuizMutation(lessonId, (lesson) => ({
    ...lesson,
    questions: [...lesson.questions, question],
  }));
  return { error, questionId: question.id };
}

export function duplicateQuestion(
  lessonId: string,
  questionId: string,
): { error: string | null; questionId: string | null } {
  let newId: string | null = null;
  const error = commitQuizMutation(lessonId, (lesson) => {
    const index = lesson.questions.findIndex((q) => q.id === questionId);
    const source = index >= 0 ? lesson.questions[index] : undefined;
    if (!source) return lesson;
    const copy = duplicateQuestionValue(source);
    newId = copy.id;
    return {
      ...lesson,
      questions: [
        ...lesson.questions.slice(0, index + 1),
        copy,
        ...lesson.questions.slice(index + 1),
      ],
    };
  });
  return { error, questionId: newId };
}

export function moveQuestion(
  lessonId: string,
  questionId: string,
  direction: "up" | "down",
): string | null {
  return commitQuizMutation(lessonId, (lesson) => {
    const index = lesson.questions.findIndex((q) => q.id === questionId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= lesson.questions.length) {
      return lesson;
    }
    const questions = [...lesson.questions];
    const moved = questions[index];
    const other = questions[target];
    if (!moved || !other) return lesson;
    questions[target] = moved;
    questions[index] = other;
    return { ...lesson, questions };
  });
}

export function removeQuestion(
  lessonId: string,
  questionId: string,
): string | null {
  return commitQuizMutation(lessonId, (lesson) => {
    const questions = lesson.questions.filter((q) => q.id !== questionId);
    if (questions.length === lesson.questions.length) return lesson;
    return { ...lesson, questions };
  });
}

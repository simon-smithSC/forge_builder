// Test-only fixtures. Excluded from the build graph via tsconfig.build.json.
import type {
  Block,
  BlockSettings,
  CourseDoc,
  Lesson,
  MediaRef,
  PublishSettings,
} from "@forge/schema";
import {
  defaultCourseSettings,
  defaultLabelSet,
  defaultTheme,
} from "@forge/schema";

export const blockSettings: BlockSettings = {
  paddingTop: 1,
  paddingBottom: 1,
  textColorMode: "auto",
};

export function makeMedia(overrides: Partial<MediaRef> & { id: string }): MediaRef {
  return {
    kind: "image",
    filename: `${overrides.id}.jpg`,
    mime: "image/jpeg",
    bytes: 1024,
    storageKey: `courses/test/media/${overrides.id}.jpg`,
    ...overrides,
  };
}

export function makeCourse(overrides: Partial<CourseDoc> = {}): CourseDoc {
  const lessons: Lesson[] = [
    { type: "section", id: "section_intro", title: "Intro section" },
    {
      type: "blocks",
      id: "lesson_blocks",
      title: "Lesson one",
      blocks: [
        {
          id: "block_text",
          family: "text",
          variant: "paragraph",
          payload: { html: "<p>Hello</p>" },
          settings: blockSettings,
          notes: "AUTHOR-ONLY-NOTE",
        },
        {
          id: "block_kc_choice",
          family: "knowledgeCheck",
          variant: "multiple response",
          payload: {
            prompt: "<p>Pick <strong>two</strong> &amp; win</p>",
            answers: [
              { id: "kc_a", html: "<p>Alpha</p>", correct: true },
              { id: "kc_b", html: "<p>Beta</p>", correct: false },
              { id: "kc_c", html: "<p>Gamma</p>", correct: true },
            ],
            correctFeedback: "<p>Yes</p>",
            incorrectFeedback: "<p>No</p>",
          },
          settings: blockSettings,
        },
        {
          id: "block_kc_matching",
          family: "knowledgeCheck",
          variant: "matching",
          payload: {
            prompt: "<p>Match things</p>",
            pairs: [
              { id: "pair_1", prompt: "Course", match: "Top activity" },
              { id: "pair_2", prompt: "Question", match: "Interaction" },
            ],
            correctFeedback: "<p>Yes</p>",
            incorrectFeedback: "<p>No</p>",
          },
          settings: blockSettings,
        },
      ] as Block[],
    },
    {
      type: "quiz",
      id: "lesson_quiz",
      title: "Final quiz",
      settings: {
        passingScore: 80,
        retryCount: 2,
        revealAnswers: "afterFinalAttempt",
        shuffleAnswerChoices: false,
        randomizeQuestionOrder: false,
      },
      questions: [
        {
          id: "q_mc",
          type: "MULTIPLE_CHOICE",
          prompt: "<p>Single answer?</p>",
          answers: [
            { id: "mc_a", html: "<p>Right</p>", correct: true },
            { id: "mc_b", html: "<p>Wrong</p>", correct: false },
          ],
        },
        {
          id: "q_mr",
          type: "MULTIPLE_RESPONSE",
          prompt: "<p>Multiple answers?</p>",
          answers: [
            { id: "mr_a", html: "<p>One</p>", correct: true },
            { id: "mr_b", html: "<p>Two</p>", correct: true },
            { id: "mr_c", html: "<p>Three</p>", correct: false },
          ],
        },
        {
          id: "q_fib",
          type: "FILL_IN_THE_BLANK",
          prompt: "<p>Fill me</p>",
          acceptedAnswers: [
            { id: "fib_a", value: "xAPI" },
            { id: "fib_b", value: "Tin Can" },
          ],
          caseSensitive: false,
        },
        {
          id: "q_match",
          type: "MATCHING",
          prompt: "<p>Match quiz</p>",
          pairs: [
            { id: "qpair_1", prompt: "First choice", match: "First match" },
            { id: "qpair_2", prompt: "Second choice", match: "Second match" },
          ],
        },
        {
          id: "q_seq",
          type: "SEQUENCING",
          prompt: "<p>Order me</p>",
          items: [
            { id: "seq_b", html: "<p>Second</p>", correctOrder: 1 },
            { id: "seq_a", html: "<p>First</p>", correctOrder: 0 },
            { id: "seq_c", html: "<p>Third</p>", correctOrder: 2 },
          ],
        },
        {
          id: "q_num_exact",
          type: "NUMERIC",
          prompt: "<p>Exact number</p>",
          grading: { mode: "exact", value: 42 },
        },
        {
          id: "q_num_range",
          type: "NUMERIC",
          prompt: "<p>Range number</p>",
          grading: { mode: "range", min: 1, max: 10 },
        },
        {
          id: "q_likert",
          type: "LIKERT",
          prompt: "<p>Agree?</p>",
          scale: [
            { id: "likert_1", label: "Disagree", value: 1 },
            { id: "likert_2", label: "Agree", value: 2 },
          ],
          required: false,
        },
      ],
    },
  ];

  return {
    schemaVersion: "1.0.0",
    id: "01JZ9S99Z8A0Y4Y6RAZ76D9M7F",
    title: "Test Course",
    description: "A test course",
    defaultLocale: "en-US",
    theme: defaultTheme,
    labelSet: defaultLabelSet,
    settings: defaultCourseSettings,
    lessons,
    media: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<PublishSettings> = {}): PublishSettings {
  return {
    tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
    reportingMode: "completed-incomplete",
    exitCourseLink: true,
    hideCoverPage: false,
    strictLaunch: false,
    statementProfile: "forge-v1",
    ...overrides,
  };
}

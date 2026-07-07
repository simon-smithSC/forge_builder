// Maps a submitted quiz question (all 7 types) to the AnsweredInput union
// consumed by TrackingPort.questionAnswered. Imports from @forge/xapi are
// TYPE-ONLY (erased at compile time) so the player bundle stays light.

import type { Question } from "@forge/schema";
import type {
  AnsweredComponent,
  AnsweredInput,
  AnsweredInteraction,
} from "@forge/xapi";

/** The per-question response state QuizLessonView holds while answering. */
export interface QuestionResponses {
  choice: string | undefined;
  multi: ReadonlySet<string>;
  textValue: string;
  numericValue: string;
  matchSelections: Readonly<Record<string, string>>;
  sequence: readonly string[];
  likertValue: string | undefined;
}

/** Authored HTML fragments become plain text descriptions in statements. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function component(id: string, description: string): AnsweredComponent {
  return { id, description };
}

function shapeInteraction(
  question: Question,
  responses: QuestionResponses,
): AnsweredInteraction {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
      return {
        type: "choice",
        choices: question.answers.map((a) => component(a.id, plainText(a.html))),
        correctChoiceIds: question.answers
          .filter((a) => a.correct)
          .map((a) => a.id),
        selectedChoiceIds:
          responses.choice !== undefined ? [responses.choice] : [],
      };
    case "MULTIPLE_RESPONSE":
      return {
        type: "choice",
        choices: question.answers.map((a) => component(a.id, plainText(a.html))),
        correctChoiceIds: question.answers
          .filter((a) => a.correct)
          .map((a) => a.id),
        selectedChoiceIds: [...responses.multi],
      };
    case "FILL_IN_THE_BLANK":
      return {
        type: "fill-in",
        acceptedAnswers: question.acceptedAnswers.map((a) => a.value),
        caseSensitive: question.caseSensitive,
        response: responses.textValue.trim(),
      };
    case "MATCHING": {
      // Targets are the authored match strings; the string doubles as the
      // component id (duplicate match texts collapse to one target).
      const targets: string[] = [];
      for (const pair of question.pairs) {
        if (!targets.includes(pair.match)) targets.push(pair.match);
      }
      return {
        type: "matching",
        source: question.pairs.map((p) => component(p.id, p.prompt)),
        target: targets.map((match) => component(match, match)),
        correctPairs: question.pairs.map((p) => ({
          sourceId: p.id,
          targetId: p.match,
        })),
        selectedPairs: question.pairs.flatMap((p) => {
          const selected = responses.matchSelections[p.id];
          return selected === undefined
            ? []
            : [{ sourceId: p.id, targetId: selected }];
        }),
      };
    }
    case "SEQUENCING":
      return {
        type: "sequencing",
        choices: question.items.map((i) => component(i.id, plainText(i.html))),
        correctOrder: [...question.items]
          .sort((a, b) => a.correctOrder - b.correctOrder)
          .map((i) => i.id),
        selectedOrder: [...responses.sequence],
      };
    case "NUMERIC":
      return {
        type: "numeric",
        correct:
          question.grading.mode === "exact"
            ? {
                kind: "exact",
                value: question.grading.value,
                ...(question.grading.tolerance !== undefined
                  ? { tolerance: question.grading.tolerance }
                  : {}),
              }
            : {
                kind: "range",
                min: question.grading.min,
                max: question.grading.max,
              },
        response: Number.parseFloat(responses.numericValue),
      };
    case "LIKERT":
      return {
        type: "likert",
        scale: question.scale.map((s) => component(s.id, s.label)),
        selectedId: responses.likertValue ?? "",
      };
  }
}

/**
 * Builds the answered statement input for one submitted question.
 * Graded questions carry success + a per-question point score; likert
 * (survey) answers omit both per the AnsweredInput contract.
 */
export function buildAnsweredInput(
  question: Question,
  responses: QuestionResponses,
  correct: boolean,
  attempt: number,
): AnsweredInput {
  const base: AnsweredInput = {
    questionId: question.id,
    prompt: plainText(question.prompt),
    interaction: shapeInteraction(question, responses),
    attempt,
  };
  if (question.type === "LIKERT") {
    return base;
  }
  const points = question.points ?? 1;
  return {
    ...base,
    success: correct,
    score: {
      raw: correct ? points : 0,
      min: 0,
      max: points,
      scaled: correct ? 1 : 0,
    },
  };
}

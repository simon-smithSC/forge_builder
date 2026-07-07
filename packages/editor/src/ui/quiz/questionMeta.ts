// Display metadata for quiz question types (badges, add-menu, card excerpts).
import type { Question } from "@forge/schema";

export const QUESTION_TYPE_LABELS: Record<Question["type"], string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  MULTIPLE_RESPONSE: "Multiple response",
  FILL_IN_THE_BLANK: "Fill in the blank",
  MATCHING: "Matching",
  SEQUENCING: "Sequencing",
  NUMERIC: "Numeric",
  LIKERT: "Likert scale",
};

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_RESPONSE",
  "FILL_IN_THE_BLANK",
  "MATCHING",
  "SEQUENCING",
  "NUMERIC",
  "LIKERT",
] as const satisfies readonly Question["type"][];

/** Plain-text excerpt of an HTML prompt for the collapsed question card. */
export function promptExcerpt(html: string, max = 80): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length === 0) return "(empty prompt)";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

/** Points summary shown on the card; LIKERT questions are ungraded. */
export function pointsLabel(question: Question): string {
  if (question.type === "LIKERT") return "Survey";
  const points = question.points ?? 1;
  return points === 1 ? "1 pt" : `${points} pts`;
}

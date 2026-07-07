// One card per question: type badge, prompt excerpt, points, and controls
// (move up/down, duplicate, delete with confirm, collapse/expand). Rejected
// commits (zod failures) show inline below the card header.
import { useState } from "react";
import type { ReactElement } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
} from "lucide-react";
import type { Question } from "@forge/schema";
import {
  duplicateQuestion,
  moveQuestion,
  removeQuestion,
  updateQuestion,
} from "../../state/quizActions.js";
import { FieldError } from "./fields.js";
import { QuestionEditor } from "./QuestionEditor.js";
import {
  QUESTION_TYPE_LABELS,
  pointsLabel,
  promptExcerpt,
} from "./questionMeta.js";

export function QuestionCard({
  lessonId,
  question,
  index,
  count,
  expanded,
  onToggle,
}: {
  lessonId: string;
  question: Question;
  index: number;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}): ReactElement {
  const [error, setError] = useState<string | null>(null);

  const commit = (next: Question): void => {
    setError(updateQuestion(lessonId, question.id, next));
  };

  const handleDelete = (): void => {
    if (!window.confirm("Delete this question?")) return;
    setError(removeQuestion(lessonId, question.id));
  };

  return (
    <article className={expanded ? "fq-card fq-card-open" : "fq-card"}>
      <header className="fq-card-head">
        <button
          type="button"
          className="fq-card-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse question" : "Expand question"}
        >
          {expanded ? (
            <ChevronDown size={14} aria-hidden />
          ) : (
            <ChevronRight size={14} aria-hidden />
          )}
        </button>
        <span className="fq-badge">{QUESTION_TYPE_LABELS[question.type]}</span>
        <span className="fq-card-excerpt">{promptExcerpt(question.prompt)}</span>
        <span className="fq-card-points">{pointsLabel(question)}</span>
        <span className="fq-row-controls">
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            disabled={index === 0}
            onClick={() => setError(moveQuestion(lessonId, question.id, "up"))}
            title="Move question up"
            aria-label={`Move question ${index + 1} up`}
          >
            <ArrowUp size={13} aria-hidden />
          </button>
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            disabled={index === count - 1}
            onClick={() => setError(moveQuestion(lessonId, question.id, "down"))}
            title="Move question down"
            aria-label={`Move question ${index + 1} down`}
          >
            <ArrowDown size={13} aria-hidden />
          </button>
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            onClick={() =>
              setError(duplicateQuestion(lessonId, question.id).error)
            }
            title="Duplicate question"
            aria-label={`Duplicate question ${index + 1}`}
          >
            <Copy size={13} aria-hidden />
          </button>
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            disabled={count <= 1}
            onClick={handleDelete}
            title={
              count <= 1
                ? "A quiz needs at least one question"
                : "Delete question"
            }
            aria-label={`Delete question ${index + 1}`}
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </span>
      </header>
      <FieldError message={error} />
      {expanded ? <QuestionEditor question={question} onCommit={commit} /> : null}
    </article>
  );
}

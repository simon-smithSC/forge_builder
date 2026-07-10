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
import { Badge, IconButton } from "@forge/ui";
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
  readOnly = false,
}: {
  lessonId: string;
  question: Question;
  index: number;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}): ReactElement {
  const [error, setError] = useState<string | null>(null);

  const commit = (next: Question): void => {
    setError(updateQuestion(lessonId, question.id, next));
  };

  const handleDelete = (): void => {
    if (readOnly) return;
    if (!window.confirm("Delete this question?")) return;
    setError(removeQuestion(lessonId, question.id));
  };

  return (
    <article className={expanded ? "fq-card fq-card-open" : "fq-card"}>
      <header className="fq-card-head">
        <IconButton
          icon={
            expanded ? (
              <ChevronDown size={14} aria-hidden />
            ) : (
              <ChevronRight size={14} aria-hidden />
            )
          }
          label={expanded ? "Collapse question" : "Expand question"}
          size="sm"
          onClick={onToggle}
          aria-expanded={expanded}
        />
        <Badge tone="primary">{QUESTION_TYPE_LABELS[question.type]}</Badge>
        <span className="fq-card-excerpt">{promptExcerpt(question.prompt)}</span>
        <span className="fq-card-points">{pointsLabel(question)}</span>
        <span className="fq-row-controls">
          <IconButton
            icon={<ArrowUp size={13} aria-hidden />}
            label={`Move question ${index + 1} up`}
            title="Move question up"
            size="sm"
            disabled={readOnly || index === 0}
            onClick={() => setError(moveQuestion(lessonId, question.id, "up"))}
          />
          <IconButton
            icon={<ArrowDown size={13} aria-hidden />}
            label={`Move question ${index + 1} down`}
            title="Move question down"
            size="sm"
            disabled={readOnly || index === count - 1}
            onClick={() => setError(moveQuestion(lessonId, question.id, "down"))}
          />
          <IconButton
            icon={<Copy size={13} aria-hidden />}
            label={`Duplicate question ${index + 1}`}
            title="Duplicate question"
            size="sm"
            disabled={readOnly}
            onClick={() =>
              setError(duplicateQuestion(lessonId, question.id).error)
            }
          />
          <IconButton
            icon={<Trash2 size={13} aria-hidden />}
            label={`Delete question ${index + 1}`}
            title={
              count <= 1
                ? "A quiz needs at least one question"
                : "Delete question"
            }
            size="sm"
            disabled={readOnly || count <= 1}
            onClick={handleDelete}
          />
        </span>
      </header>
      <FieldError message={error} />
      {expanded ? (
        <QuestionEditor
          question={question}
          onCommit={readOnly ? () => undefined : commit}
        />
      ) : null}
    </article>
  );
}

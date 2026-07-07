// Per-question editor: common fields (prompt, points, rationale, feedback)
// plus the type-specific editor. Optional keys are omitted when emptied
// (exactOptionalPropertyTypes discipline); commits are validated upstream.
import type { ReactElement } from "react";
import type { Question } from "@forge/schema";
import { ChoiceAnswersEditor, FillBlankEditor } from "./ChoiceEditors.js";
import { NumberField, QuizHtmlField } from "./fields.js";
import {
  LikertEditor,
  MatchingEditor,
  NumericEditor,
  SequencingEditor,
} from "./StructureEditors.js";

export function QuestionEditor({
  question,
  onCommit,
}: {
  question: Question;
  onCommit: (next: Question) => void;
}): ReactElement {
  const setPrompt = (prompt: string): void => {
    onCommit({ ...question, prompt });
  };

  const setPoints = (points: number | null): void => {
    if (question.type === "LIKERT") return;
    const next = { ...question };
    if (points === null) delete next.points;
    else next.points = points;
    onCommit(next);
  };

  const setRationale = (value: string): void => {
    const next = { ...question };
    if (value.trim() === "") delete next.rationale;
    else next.rationale = value;
    onCommit(next);
  };

  const setFeedback = (key: "correct" | "incorrect", value: string): void => {
    if (question.type === "LIKERT") return;
    const source = question.feedback;
    const feedback: { correct?: string; incorrect?: string } = {};
    if (source?.correct !== undefined) feedback.correct = source.correct;
    if (source?.incorrect !== undefined) feedback.incorrect = source.incorrect;
    if (value.trim() === "") delete feedback[key];
    else feedback[key] = value;
    const next = { ...question };
    if (feedback.correct === undefined && feedback.incorrect === undefined) {
      delete next.feedback;
    } else {
      next.feedback = feedback;
    }
    onCommit(next);
  };

  const renderTypeEditor = (): ReactElement => {
    switch (question.type) {
      case "MULTIPLE_CHOICE":
      case "MULTIPLE_RESPONSE":
        return <ChoiceAnswersEditor question={question} onCommit={onCommit} />;
      case "FILL_IN_THE_BLANK":
        return <FillBlankEditor question={question} onCommit={onCommit} />;
      case "MATCHING":
        return <MatchingEditor question={question} onCommit={onCommit} />;
      case "SEQUENCING":
        return <SequencingEditor question={question} onCommit={onCommit} />;
      case "NUMERIC":
        return <NumericEditor question={question} onCommit={onCommit} />;
      case "LIKERT":
        return <LikertEditor question={question} onCommit={onCommit} />;
    }
  };

  return (
    <div className="fq-question-editor">
      <QuizHtmlField
        label="Prompt (HTML)"
        value={question.prompt}
        rows={3}
        onCommit={setPrompt}
      />
      {question.type !== "LIKERT" ? (
        <NumberField
          label="Points (empty = 1)"
          value={question.points ?? null}
          min={0}
          step="any"
          allowEmpty
          onCommit={setPoints}
        />
      ) : null}
      {renderTypeEditor()}
      <QuizHtmlField
        label="Rationale (HTML, optional)"
        value={question.rationale ?? ""}
        onCommit={setRationale}
      />
      {question.type !== "LIKERT" ? (
        <div className="fq-grid">
          <QuizHtmlField
            label="Feedback when correct (optional)"
            value={question.feedback?.correct ?? ""}
            onCommit={(value) => setFeedback("correct", value)}
          />
          <QuizHtmlField
            label="Feedback when incorrect (optional)"
            value={question.feedback?.incorrect ?? ""}
            onCommit={(value) => setFeedback("incorrect", value)}
          />
        </div>
      ) : null}
    </div>
  );
}

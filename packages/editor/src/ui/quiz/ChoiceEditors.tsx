// Type-specific editors for answer-list question types: multiple choice,
// multiple response, and fill in the blank. Commits flow upward through
// QuestionCard, where the whole lesson is schema-validated.
import type { ReactElement } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Checkbox, IconButton, Radio } from "@forge/ui";
import type { Question } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { CheckboxField, QuizHtmlField, TextField } from "./fields.js";

type ChoiceQuestion = Extract<
  Question,
  { type: "MULTIPLE_CHOICE" | "MULTIPLE_RESPONSE" }
>;
type FillQuestion = Extract<Question, { type: "FILL_IN_THE_BLANK" }>;
type ChoiceAnswer = ChoiceQuestion["answers"][number];

export function ChoiceAnswersEditor({
  question,
  onCommit,
}: {
  question: ChoiceQuestion;
  onCommit: (next: Question) => void;
}): ReactElement {
  const single = question.type === "MULTIPLE_CHOICE";

  const setAnswers = (answers: ChoiceAnswer[]): void => {
    onCommit({ ...question, answers });
  };

  // MC enforces exactly one correct answer: selecting one clears the others.
  const setCorrect = (answerId: string, correct: boolean): void => {
    setAnswers(
      question.answers.map((answer) => {
        if (single) return { ...answer, correct: answer.id === answerId };
        return answer.id === answerId ? { ...answer, correct } : answer;
      }),
    );
  };

  const setHtml = (answerId: string, html: string): void => {
    setAnswers(
      question.answers.map((answer) =>
        answer.id === answerId ? { ...answer, html } : answer,
      ),
    );
  };

  const setAnswerFeedback = (answerId: string, value: string): void => {
    setAnswers(
      question.answers.map((answer) => {
        if (answer.id !== answerId) return answer;
        const next: ChoiceAnswer = { ...answer };
        if (value.trim() === "") delete next.feedback;
        else next.feedback = value;
        return next;
      }),
    );
  };

  const addAnswer = (): void => {
    setAnswers([
      ...question.answers,
      { id: createUlid(), html: "<p>New answer</p>", correct: false },
    ]);
  };

  const removeAnswer = (answerId: string): void => {
    setAnswers(question.answers.filter((answer) => answer.id !== answerId));
  };

  return (
    <div className="fq-subsection">
      <span className="fe-field-label">
        {single ? "Answers (exactly one correct)" : "Answers (any number correct)"}
      </span>
      {question.answers.map((answer, index) => (
        <div key={answer.id} className="fq-item-row">
          {single ? (
            <Radio
              className="fq-correct"
              label="Correct"
              name={`fq-correct-${question.id}`}
              checked={answer.correct}
              onChange={(event) => setCorrect(answer.id, event.target.checked)}
              aria-label={`Answer ${index + 1} is correct`}
            />
          ) : (
            <Checkbox
              className="fq-correct"
              label="Correct"
              checked={answer.correct}
              onChange={(event) => setCorrect(answer.id, event.target.checked)}
              aria-label={`Answer ${index + 1} is correct`}
            />
          )}
          <div className="fq-item-fields">
            <QuizHtmlField
              label={`Answer ${index + 1} (HTML)`}
              value={answer.html}
              onCommit={(value) => setHtml(answer.id, value)}
            />
            <QuizHtmlField
              label="Answer feedback (optional)"
              value={answer.feedback ?? ""}
              onCommit={(value) => setAnswerFeedback(answer.id, value)}
            />
          </div>
          <IconButton
            icon={<Trash2 size={13} aria-hidden />}
            label={`Remove answer ${index + 1}`}
            title={
              question.answers.length <= 2
                ? "At least two answers are required"
                : "Remove answer"
            }
            size="sm"
            disabled={question.answers.length <= 2}
            onClick={() => removeAnswer(answer.id)}
          />
        </div>
      ))}
      <button type="button" className="fq-add-inline" onClick={addAnswer}>
        <Plus size={13} aria-hidden /> Add answer
      </button>
    </div>
  );
}

export function FillBlankEditor({
  question,
  onCommit,
}: {
  question: FillQuestion;
  onCommit: (next: Question) => void;
}): ReactElement {
  const setAccepted = (
    acceptedAnswers: FillQuestion["acceptedAnswers"],
  ): void => {
    onCommit({ ...question, acceptedAnswers });
  };

  return (
    <div className="fq-subsection">
      <span className="fe-field-label">Accepted answers</span>
      {question.acceptedAnswers.map((accepted, index) => (
        <div key={accepted.id} className="fq-item-row">
          <div className="fq-item-fields">
            <TextField
              label={`Accepted answer ${index + 1}`}
              value={accepted.value}
              onCommit={(value) =>
                setAccepted(
                  question.acceptedAnswers.map((item) =>
                    item.id === accepted.id ? { ...item, value } : item,
                  ),
                )
              }
            />
          </div>
          <IconButton
            icon={<Trash2 size={13} aria-hidden />}
            label={`Remove accepted answer ${index + 1}`}
            title={
              question.acceptedAnswers.length <= 1
                ? "At least one accepted answer is required"
                : "Remove accepted answer"
            }
            size="sm"
            disabled={question.acceptedAnswers.length <= 1}
            onClick={() =>
              setAccepted(
                question.acceptedAnswers.filter((item) => item.id !== accepted.id),
              )
            }
          />
        </div>
      ))}
      <button
        type="button"
        className="fq-add-inline"
        onClick={() =>
          setAccepted([
            ...question.acceptedAnswers,
            { id: createUlid(), value: "Answer" },
          ])
        }
      >
        <Plus size={13} aria-hidden /> Add accepted answer
      </button>
      <CheckboxField
        label="Case sensitive"
        checked={question.caseSensitive}
        onChange={(checked) => onCommit({ ...question, caseSensitive: checked })}
      />
    </div>
  );
}

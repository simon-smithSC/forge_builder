import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Html } from "@forge/blocks";
import type { LabelSet, Question, QuizLesson } from "@forge/schema";
// Type-only imports: the player bundle never ships xapi runtime code.
import type { AnsweredInput, QuizScore } from "@forge/xapi";
import { buildAnsweredInput } from "./answeredInput.js";

/**
 * R1 quiz runtime: questions one at a time, submit per question, always show
 * correct/incorrect plus rationale after submit (reveal policies are R3),
 * score at the end vs settings.passingScore, retry honoring retryCount.
 */
export interface QuizLessonViewProps {
  lesson: QuizLesson;
  labels: LabelSet;
  /** Fired when a question is submitted; the id gates lesson completion. */
  onQuestionAnswered: (questionId: string) => void;
  /** Fired when the result screen is reached (lesson counts complete). */
  onFinished: (passed: boolean) => void;
  /** R3 tracking: statement input for every submitted question. */
  onQuestionSubmitted?: (input: AnsweredInput) => void;
  /** R3 tracking: fired once per attempt at the result screen. */
  onQuizResult?: (
    score: QuizScore,
    passed: boolean,
    attemptsExhausted: boolean,
  ) => void;
  /** 1-based attempt number to start from (resume across sessions). */
  initialAttempt?: number;
}

type Phase = "answering" | "feedback" | "result";

interface Outcome {
  correct: boolean;
  graded: boolean;
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i]!;
    out[i] = out[j]!;
    out[j] = swap;
  }
  return out;
}

function prepareQuestions(lesson: QuizLesson): Question[] {
  const base = lesson.settings.randomizeQuestionOrder
    ? shuffle(lesson.questions)
    : [...lesson.questions];
  if (!lesson.settings.shuffleAnswerChoices) return base;
  return base.map((question) => {
    switch (question.type) {
      case "MULTIPLE_CHOICE":
      case "MULTIPLE_RESPONSE":
        return { ...question, answers: shuffle(question.answers) };
      case "SEQUENCING":
        return { ...question, items: shuffle(question.items) };
      default:
        return question;
    }
  });
}

export function QuizLessonView({
  lesson,
  labels,
  onQuestionAnswered,
  onFinished,
  onQuestionSubmitted,
  onQuizResult,
  initialAttempt,
}: QuizLessonViewProps): ReactElement {
  const [questions, setQuestions] = useState<Question[]>(() =>
    prepareQuestions(lesson),
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [attempt, setAttempt] = useState(initialAttempt ?? 1);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});

  // Per-question response state, reset whenever the question changes.
  const [choice, setChoice] = useState<string | undefined>(undefined);
  const [multi, setMulti] = useState<ReadonlySet<string>>(new Set());
  const [textValue, setTextValue] = useState("");
  const [numericValue, setNumericValue] = useState("");
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});
  const [sequence, setSequence] = useState<string[]>([]);
  const [likertValue, setLikertValue] = useState<string | undefined>(undefined);

  const question = questions[index];

  useEffect(() => {
    setChoice(undefined);
    setMulti(new Set());
    setTextValue("");
    setNumericValue("");
    setMatchSelections({});
    setLikertValue(undefined);
    setSequence(
      question?.type === "SEQUENCING" ? question.items.map((item) => item.id) : [],
    );
  }, [question]);

  const matchOptions = useMemo(
    () =>
      question?.type === "MATCHING"
        ? shuffle(question.pairs.map((pair) => pair.match))
        : [],
    [question],
  );

  const score = useMemo(() => {
    let possible = 0;
    let earned = 0;
    for (const q of questions) {
      if (q.type === "LIKERT") continue;
      const points = q.points ?? 1;
      possible += points;
      if (outcomes[q.id]?.correct) earned += points;
    }
    const percent = possible === 0 ? 100 : Math.round((earned / possible) * 100);
    const scaled = possible === 0 ? 1 : earned / possible;
    return {
      percent,
      passed: percent >= lesson.settings.passingScore,
      raw: earned,
      max: possible,
      scaled,
    };
  }, [questions, outcomes, lesson.settings.passingScore]);

  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const onQuizResultRef = useRef(onQuizResult);
  onQuizResultRef.current = onQuizResult;
  useEffect(() => {
    if (phase !== "result") return;
    onFinishedRef.current(score.passed);
    const retriesUsed = attempt - 1;
    const canRetry =
      lesson.settings.retryCount === -1 ||
      retriesUsed < lesson.settings.retryCount;
    onQuizResultRef.current?.(
      { raw: score.raw, min: 0, max: score.max, scaled: score.scaled },
      score.passed,
      !score.passed && !canRetry,
    );
    // score/attempt are stable once the result screen renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!question && phase !== "result") {
    return <div className="fp-quiz" />;
  }

  const canSubmit = (): boolean => {
    if (!question) return false;
    switch (question.type) {
      case "MULTIPLE_CHOICE":
        return choice !== undefined;
      case "MULTIPLE_RESPONSE":
        return multi.size > 0;
      case "FILL_IN_THE_BLANK":
        return textValue.trim().length > 0;
      case "MATCHING":
        return question.pairs.every((pair) => Boolean(matchSelections[pair.id]));
      case "SEQUENCING":
        return sequence.length > 0;
      case "NUMERIC":
        return Number.isFinite(Number.parseFloat(numericValue));
      case "LIKERT":
        return likertValue !== undefined;
    }
  };

  const grade = (q: Question): Outcome => {
    switch (q.type) {
      case "MULTIPLE_CHOICE": {
        const selected = q.answers.find((answer) => answer.id === choice);
        return { correct: Boolean(selected?.correct), graded: true };
      }
      case "MULTIPLE_RESPONSE": {
        const correctIds = new Set(
          q.answers.filter((answer) => answer.correct).map((answer) => answer.id),
        );
        const correct =
          correctIds.size === multi.size &&
          [...multi].every((id) => correctIds.has(id));
        return { correct, graded: true };
      }
      case "FILL_IN_THE_BLANK": {
        const value = textValue.trim();
        const correct = q.acceptedAnswers.some((accepted) =>
          q.caseSensitive
            ? accepted.value.trim() === value
            : accepted.value.trim().toLowerCase() === value.toLowerCase(),
        );
        return { correct, graded: true };
      }
      case "MATCHING": {
        const correct = q.pairs.every(
          (pair) => matchSelections[pair.id] === pair.match,
        );
        return { correct, graded: true };
      }
      case "SEQUENCING": {
        const correctOrder = [...q.items]
          .sort((a, b) => a.correctOrder - b.correctOrder)
          .map((item) => item.id);
        const correct =
          correctOrder.length === sequence.length &&
          correctOrder.every((id, i) => sequence[i] === id);
        return { correct, graded: true };
      }
      case "NUMERIC": {
        const value = Number.parseFloat(numericValue);
        if (!Number.isFinite(value)) return { correct: false, graded: true };
        if (q.grading.mode === "exact") {
          const tolerance = q.grading.tolerance ?? 0;
          return { correct: Math.abs(value - q.grading.value) <= tolerance, graded: true };
        }
        return {
          correct: value >= q.grading.min && value <= q.grading.max,
          graded: true,
        };
      }
      case "LIKERT":
        return { correct: true, graded: false };
    }
  };

  const advance = (): void => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPhase("answering");
    } else {
      setPhase("result");
    }
  };

  const handleSubmit = (): void => {
    if (!question || !canSubmit()) return;
    const outcome = grade(question);
    setOutcomes((prev) => ({ ...prev, [question.id]: outcome }));
    onQuestionAnswered(question.id);
    onQuestionSubmitted?.(
      buildAnsweredInput(
        question,
        {
          choice,
          multi,
          textValue,
          numericValue,
          matchSelections,
          sequence,
          likertValue,
        },
        outcome.correct,
        attempt,
      ),
    );
    if (question.type === "LIKERT") {
      advance();
    } else {
      setPhase("feedback");
    }
  };

  const handleRetry = (): void => {
    setQuestions(prepareQuestions(lesson));
    setOutcomes({});
    setIndex(0);
    setAttempt(attempt + 1);
    setPhase("answering");
  };

  if (phase === "result") {
    const retriesUsed = attempt - 1;
    const canRetry =
      lesson.settings.retryCount === -1 ||
      retriesUsed < lesson.settings.retryCount;
    return (
      <div className="fp-quiz fp-quiz-result" role="status">
        <div
          className={`fp-quiz-result-ring${
            score.passed ? " fp-quiz-result-ring-passed" : ""
          }`}
        >
          <span className="fp-quiz-result-percent">{score.percent}%</span>
        </div>
        <h2 className="fp-quiz-result-heading">
          {score.passed ? labels.passed : labels.failed}
        </h2>
        <p className="fp-quiz-result-score">
          {score.percent}% / {lesson.settings.passingScore}%
        </p>
        {!score.passed && canRetry ? (
          <button type="button" className="fp-quiz-pill" onClick={handleRetry}>
            {labels.retry}
          </button>
        ) : null}
      </div>
    );
  }

  if (!question) return <div className="fp-quiz" />;

  const outcome = outcomes[question.id];

  const renderAnswerArea = (): ReactElement | null => {
    switch (question.type) {
      case "MULTIPLE_CHOICE":
        return (
          <fieldset className="fp-quiz-choices">
            <legend className="fp-sr-only">Answer choices</legend>
            {question.answers.map((answer) => (
              <label
                key={answer.id}
                className={`fp-quiz-choice${
                  choice === answer.id ? " fp-quiz-choice-selected" : ""
                }`}
              >
                <input
                  className="fp-quiz-choice-input"
                  type="radio"
                  name={`fp-q-${question.id}`}
                  value={answer.id}
                  checked={choice === answer.id}
                  onChange={() => setChoice(answer.id)}
                />
                <span
                  className="fp-quiz-choice-glyph fp-quiz-choice-glyph-radio"
                  aria-hidden="true"
                />
                <span className="fp-quiz-choice-text">
                  <Html fragment={answer.html} />
                </span>
              </label>
            ))}
          </fieldset>
        );
      case "MULTIPLE_RESPONSE":
        return (
          <fieldset className="fp-quiz-choices">
            <legend className="fp-sr-only">Answer choices, select all that apply</legend>
            {question.answers.map((answer) => (
              <label
                key={answer.id}
                className={`fp-quiz-choice${
                  multi.has(answer.id) ? " fp-quiz-choice-selected" : ""
                }`}
              >
                <input
                  className="fp-quiz-choice-input"
                  type="checkbox"
                  name={`fp-q-${question.id}`}
                  value={answer.id}
                  checked={multi.has(answer.id)}
                  onChange={() =>
                    setMulti((prev) => {
                      const next = new Set(prev);
                      if (next.has(answer.id)) next.delete(answer.id);
                      else next.add(answer.id);
                      return next;
                    })
                  }
                />
                <span
                  className="fp-quiz-choice-glyph fp-quiz-choice-glyph-check"
                  aria-hidden="true"
                />
                <span className="fp-quiz-choice-text">
                  <Html fragment={answer.html} />
                </span>
              </label>
            ))}
          </fieldset>
        );
      case "FILL_IN_THE_BLANK":
        return (
          <div className="fp-quiz-fill">
            <label>
              <span className="fp-sr-only">Your answer</span>
              <input
                type="text"
                className="fp-quiz-input"
                value={textValue}
                autoComplete="off"
                onChange={(event) => setTextValue(event.target.value)}
              />
            </label>
          </div>
        );
      case "MATCHING":
        return (
          <div className="fp-quiz-matching">
            {question.pairs.map((pair) => (
              <label key={pair.id} className="fp-quiz-match-row">
                <span className="fp-quiz-match-prompt">{pair.prompt}</span>
                <select
                  className="fp-quiz-select"
                  value={matchSelections[pair.id] ?? ""}
                  onChange={(event) =>
                    setMatchSelections((prev) => ({
                      ...prev,
                      [pair.id]: event.target.value,
                    }))
                  }
                >
                  <option value="" disabled>
                    –
                  </option>
                  {matchOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        );
      case "SEQUENCING": {
        const itemsById = new Map(question.items.map((item) => [item.id, item]));
        return (
          <ol className="fp-quiz-sequence">
            {sequence.map((id, i) => {
              const item = itemsById.get(id);
              if (!item) return null;
              return (
                <li key={id} className="fp-quiz-sequence-item">
                  <Html fragment={item.html} />
                  <span className="fp-quiz-sequence-controls">
                    <button
                      type="button"
                      className="fp-button fp-button-small"
                      aria-label={`Move item ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() =>
                        setSequence((prev) => {
                          const next = [...prev];
                          const swap = next[i - 1]!;
                          next[i - 1] = next[i]!;
                          next[i] = swap;
                          return next;
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="fp-button fp-button-small"
                      aria-label={`Move item ${i + 1} down`}
                      disabled={i === sequence.length - 1}
                      onClick={() =>
                        setSequence((prev) => {
                          if (i + 1 >= prev.length) return prev;
                          const next = [...prev];
                          const swap = next[i + 1]!;
                          next[i + 1] = next[i]!;
                          next[i] = swap;
                          return next;
                        })
                      }
                    >
                      ↓
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        );
      }
      case "NUMERIC":
        return (
          <div className="fp-quiz-fill">
            <label>
              <span className="fp-sr-only">Your answer (number)</span>
              <input
                type="number"
                step="any"
                className="fp-quiz-input"
                value={numericValue}
                onChange={(event) => setNumericValue(event.target.value)}
              />
            </label>
          </div>
        );
      case "LIKERT":
        return (
          <fieldset className="fp-quiz-likert">
            <legend className="fp-sr-only">Rating scale</legend>
            {question.scale.map((step) => (
              <label
                key={step.id}
                className={`fp-quiz-choice fp-quiz-likert-step${
                  likertValue === step.id ? " fp-quiz-choice-selected" : ""
                }`}
              >
                <input
                  className="fp-quiz-choice-input"
                  type="radio"
                  name={`fp-q-${question.id}`}
                  value={step.id}
                  checked={likertValue === step.id}
                  onChange={() => setLikertValue(step.id)}
                />
                <span
                  className="fp-quiz-choice-glyph fp-quiz-choice-glyph-radio"
                  aria-hidden="true"
                />
                <span className="fp-quiz-choice-text">{step.label}</span>
              </label>
            ))}
          </fieldset>
        );
    }
  };

  const renderFeedback = (): ReactElement | null => {
    if (phase !== "feedback" || !outcome || !outcome.graded) return null;
    const questionFeedback =
      question.type === "LIKERT"
        ? undefined
        : outcome.correct
          ? question.feedback?.correct
          : question.feedback?.incorrect;
    const selectedAnswerFeedback =
      question.type === "MULTIPLE_CHOICE"
        ? question.answers.find((answer) => answer.id === choice)?.feedback
        : undefined;
    return (
      <div
        className={`fp-quiz-feedback ${outcome.correct ? "fp-quiz-feedback-correct" : "fp-quiz-feedback-incorrect"}`}
        role="status"
      >
        <div className="fp-quiz-feedback-head">
          <span className="fp-quiz-feedback-icon" aria-hidden="true">
            {outcome.correct ? (
              <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
                <path
                  d="M13.5 4.5 6.5 11.5 2.5 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
                <path
                  d="M4.5 4.5l7 7m0-7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
          <p className="fp-quiz-feedback-verdict">
            {outcome.correct ? labels.correct : labels.incorrect}
          </p>
        </div>
        {questionFeedback ? <Html fragment={questionFeedback} /> : null}
        {selectedAnswerFeedback ? <Html fragment={selectedAnswerFeedback} /> : null}
        {question.rationale ? (
          <div className="fp-quiz-rationale">
            <Html fragment={question.rationale} />
          </div>
        ) : null}
        <button type="button" className="fp-quiz-pill" onClick={advance}>
          {labels.continue}
        </button>
      </div>
    );
  };

  return (
    <div className="fp-quiz">
      <div className="fp-quiz-progress">
        <p className="fp-quiz-progress-label">
          Question {index + 1} of {questions.length}
        </p>
        <div className="fp-quiz-progress-track" aria-hidden="true">
          <div
            className="fp-quiz-progress-fill"
            style={{
              width: `${Math.round(((index + 1) / questions.length) * 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="fp-quiz-prompt">
        <Html fragment={question.prompt} />
      </div>
      <div className="fp-quiz-answers">{renderAnswerArea()}</div>
      {phase === "answering" ? (
        <button
          type="button"
          className="fp-quiz-pill"
          disabled={!canSubmit()}
          onClick={handleSubmit}
        >
          {labels.submit}
        </button>
      ) : (
        renderFeedback()
      )}
    </div>
  );
}

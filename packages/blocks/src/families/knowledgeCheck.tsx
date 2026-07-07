import type { ReactElement } from "react";
import { useId, useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ChoiceBlock =
  | BlockFor<"knowledgeCheck", "multiple choice">
  | BlockFor<"knowledgeCheck", "multiple response">;
type FillBlankBlock = BlockFor<"knowledgeCheck", "fill in the blank">;
type MatchingBlock = BlockFor<"knowledgeCheck", "matching">;
type KnowledgeCheckBlock = ChoiceBlock | FillBlankBlock | MatchingBlock;

interface ResultState {
  correct: boolean;
}

function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

function FeedbackPanel({
  result,
  correctFeedback,
  incorrectFeedback,
  extra,
  onRetry,
}: {
  result: ResultState;
  correctFeedback: string;
  incorrectFeedback: string;
  extra?: ReactElement | null;
  onRetry: () => void;
}): ReactElement {
  const { labels } = useRenderContext();
  const tone = result.correct
    ? "fb-knowledgeCheck-feedback-correct"
    : "fb-knowledgeCheck-feedback-incorrect";
  return (
    <div className={`fb-knowledgeCheck-feedback ${tone}`} role="status">
      <p className="fb-knowledgeCheck-verdict">
        {result.correct ? labels.correct : labels.incorrect}
      </p>
      <Html fragment={result.correct ? correctFeedback : incorrectFeedback} />
      {extra ?? null}
      <button type="button" className="fb-knowledgeCheck-retry" onClick={onRetry}>
        {labels.retry}
      </button>
    </div>
  );
}

function ChoiceCheck({
  block,
  multiple,
}: {
  block: ChoiceBlock;
  multiple: boolean;
}): ReactElement {
  const { mode, events, labels } = useRenderContext();
  const groupName = useId();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<ResultState | null>(null);
  const [reported, setReported] = useState(false);
  const p = block.payload;

  const toggle = (answerId: string) => {
    if (result) return;
    if (multiple) {
      const next = new Set(selected);
      if (next.has(answerId)) next.delete(answerId);
      else next.add(answerId);
      setSelected(next);
    } else {
      setSelected(new Set([answerId]));
    }
  };

  const submit = () => {
    const correctIds = new Set(
      p.answers.filter((answer) => answer.correct).map((answer) => answer.id),
    );
    const correct = multiple
      ? selected.size === correctIds.size &&
        [...selected].every((id) => correctIds.has(id))
      : selected.size === 1 && [...selected].every((id) => correctIds.has(id));
    setResult({ correct });
    if (mode === "player" && !reported) {
      setReported(true);
      events.onCompleted?.(block.id, { correct });
    }
  };

  const reset = () => {
    setSelected(new Set());
    setResult(null);
  };

  const perAnswerFeedback = p.answers
    .filter((answer) => selected.has(answer.id) && answer.feedback)
    .map((answer) =>
      answer.feedback ? (
        <Html
          key={answer.id}
          fragment={answer.feedback}
          className="fb-knowledgeCheck-answer-feedback"
        />
      ) : null,
    );

  return (
    <div className="fb-knowledgeCheck">
      <Html fragment={p.prompt} className="fb-knowledgeCheck-prompt" />
      <div
        className="fb-knowledgeCheck-answers"
        role={multiple ? "group" : "radiogroup"}
      >
        {p.answers.map((answer) => (
          <label
            key={answer.id}
            className={`fb-knowledgeCheck-answer${
              selected.has(answer.id) ? " fb-knowledgeCheck-answer-selected" : ""
            }`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={groupName}
              checked={selected.has(answer.id)}
              disabled={result !== null}
              onChange={() => toggle(answer.id)}
            />
            <Html fragment={answer.html} className="fb-knowledgeCheck-answer-html" />
          </label>
        ))}
      </div>
      {result ? (
        <FeedbackPanel
          result={result}
          correctFeedback={p.correctFeedback}
          incorrectFeedback={p.incorrectFeedback}
          extra={
            perAnswerFeedback.length > 0 ? (
              <div className="fb-knowledgeCheck-answer-feedback-list">
                {perAnswerFeedback}
              </div>
            ) : null
          }
          onRetry={reset}
        />
      ) : (
        <button
          type="button"
          className="fb-knowledgeCheck-submit"
          disabled={selected.size === 0}
          onClick={submit}
        >
          {labels.submit}
        </button>
      )}
    </div>
  );
}

function FillBlankCheck({ block }: { block: FillBlankBlock }): ReactElement {
  const { mode, events, labels } = useRenderContext();
  const inputId = useId();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [reported, setReported] = useState(false);
  const p = block.payload;

  const submit = () => {
    const trimmed = value.trim();
    const correct = p.acceptedAnswers.some((accepted) =>
      p.caseSensitive
        ? accepted.value === trimmed
        : accepted.value.toLowerCase() === trimmed.toLowerCase(),
    );
    setResult({ correct });
    if (mode === "player" && !reported) {
      setReported(true);
      events.onCompleted?.(block.id, { correct });
    }
  };

  const reset = () => {
    setValue("");
    setResult(null);
  };

  return (
    <div className="fb-knowledgeCheck">
      <Html fragment={p.prompt} className="fb-knowledgeCheck-prompt" />
      <div className="fb-knowledgeCheck-blank">
        <label className="fb-knowledgeCheck-blank-label" htmlFor={inputId}>
          Your answer
        </label>
        <input
          id={inputId}
          type="text"
          className="fb-knowledgeCheck-blank-input"
          value={value}
          disabled={result !== null}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      {result ? (
        <FeedbackPanel
          result={result}
          correctFeedback={p.correctFeedback}
          incorrectFeedback={p.incorrectFeedback}
          onRetry={reset}
        />
      ) : (
        <button
          type="button"
          className="fb-knowledgeCheck-submit"
          disabled={value.trim().length === 0}
          onClick={submit}
        >
          {labels.submit}
        </button>
      )}
    </div>
  );
}

function MatchingCheck({ block }: { block: MatchingBlock }): ReactElement {
  const { mode, events, labels } = useRenderContext();
  const [choices, setChoices] = useState<Readonly<Record<string, string>>>({});
  const [result, setResult] = useState<ResultState | null>(null);
  const [reported, setReported] = useState(false);
  const p = block.payload;
  const [options] = useState<readonly string[]>(() =>
    shuffle(p.pairs.map((pair) => pair.match)),
  );

  const allChosen = p.pairs.every((pair) => (choices[pair.id] ?? "") !== "");

  const submit = () => {
    const correct = p.pairs.every((pair) => choices[pair.id] === pair.match);
    setResult({ correct });
    if (mode === "player" && !reported) {
      setReported(true);
      events.onCompleted?.(block.id, { correct });
    }
  };

  const reset = () => {
    setChoices({});
    setResult(null);
  };

  return (
    <div className="fb-knowledgeCheck">
      <Html fragment={p.prompt} className="fb-knowledgeCheck-prompt" />
      <div className="fb-knowledgeCheck-matches">
        {p.pairs.map((pair) => (
          <label key={pair.id} className="fb-knowledgeCheck-match-row">
            <span className="fb-knowledgeCheck-match-prompt">{pair.prompt}</span>
            <select
              className="fb-knowledgeCheck-match-select"
              value={choices[pair.id] ?? ""}
              disabled={result !== null}
              onChange={(event) =>
                setChoices({ ...choices, [pair.id]: event.target.value })
              }
            >
              <option value="" disabled>
                Select a match
              </option>
              {options.map((option, optionIndex) => (
                <option key={`${option}-${optionIndex}`} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {result ? (
        <FeedbackPanel
          result={result}
          correctFeedback={p.correctFeedback}
          incorrectFeedback={p.incorrectFeedback}
          onRetry={reset}
        />
      ) : (
        <button
          type="button"
          className="fb-knowledgeCheck-submit"
          disabled={!allChosen}
          onClick={submit}
        >
          {labels.submit}
        </button>
      )}
    </div>
  );
}

function KnowledgeCheckRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as KnowledgeCheckBlock;
  switch (b.variant) {
    case "multiple choice":
      return <ChoiceCheck block={b} multiple={false} />;
    case "multiple response":
      return <ChoiceCheck block={b} multiple={true} />;
    case "fill in the blank":
      return <FillBlankCheck block={b} />;
    case "matching":
      return <MatchingCheck block={b} />;
  }
}

const defaults: Record<string, () => unknown> = {
  "multiple choice": () => ({
    prompt: "<p>Which option is correct?</p>",
    answers: [
      { id: "answer-1", html: "<p>The correct answer</p>", correct: true },
      { id: "answer-2", html: "<p>A distractor</p>", correct: false },
    ],
    correctFeedback: "<p>That is right.</p>",
    incorrectFeedback: "<p>Not quite. Review the material and try again.</p>",
  }),
  "multiple response": () => ({
    prompt: "<p>Select all options that apply.</p>",
    answers: [
      { id: "answer-1", html: "<p>A correct answer</p>", correct: true },
      { id: "answer-2", html: "<p>Another correct answer</p>", correct: true },
      { id: "answer-3", html: "<p>A distractor</p>", correct: false },
    ],
    correctFeedback: "<p>That is right.</p>",
    incorrectFeedback: "<p>Not quite. Review the material and try again.</p>",
  }),
  "fill in the blank": () => ({
    prompt: "<p>Type the missing word.</p>",
    acceptedAnswers: [{ id: "accepted-1", value: "answer" }],
    caseSensitive: false,
    correctFeedback: "<p>That is right.</p>",
    incorrectFeedback: "<p>Not quite. Review the material and try again.</p>",
  }),
  matching: () => ({
    prompt: "<p>Match each term to its definition.</p>",
    pairs: [
      { id: "pair-1", prompt: "First term", match: "First definition" },
      { id: "pair-2", prompt: "Second term", match: "Second definition" },
    ],
    correctFeedback: "<p>That is right.</p>",
    incorrectFeedback: "<p>Not quite. Review the material and try again.</p>",
  }),
};

export const knowledgeCheckEntry: BlockRegistryEntry = {
  family: "knowledgeCheck",
  variants: variantsOf("knowledgeCheck"),
  palette: {
    label: "Knowledge check",
    group: "quiz",
    description: "Inline questions with instant feedback.",
    icon: "circle-check",
  },
  createDefaultPayload: (variant) => {
    const factory = defaults[variant];
    if (!factory) throw new Error(`Unknown knowledgeCheck variant "${variant}".`);
    return factory();
  },
  validatePayload: (payload, variant) =>
    validateWithSchema("knowledgeCheck", variant, payload),
  Renderer: KnowledgeCheckRendererImpl,
};

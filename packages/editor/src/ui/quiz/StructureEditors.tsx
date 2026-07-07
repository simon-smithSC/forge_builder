// Type-specific editors for matching, sequencing, numeric, and Likert
// questions. Commits flow upward through QuestionCard, where the whole
// lesson is schema-validated before being applied.
import { useState } from "react";
import type { ReactElement } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Question } from "@forge/schema";
import { createUlid } from "@forge/schema";
import {
  CheckboxField,
  FieldError,
  NumberField,
  QuizHtmlField,
  TextField,
} from "./fields.js";

type MatchingQuestion = Extract<Question, { type: "MATCHING" }>;
type SequencingQuestion = Extract<Question, { type: "SEQUENCING" }>;
type NumericQuestion = Extract<Question, { type: "NUMERIC" }>;
type LikertQuestion = Extract<Question, { type: "LIKERT" }>;

export function MatchingEditor({
  question,
  onCommit,
}: {
  question: MatchingQuestion;
  onCommit: (next: Question) => void;
}): ReactElement {
  const setPairs = (pairs: MatchingQuestion["pairs"]): void => {
    onCommit({ ...question, pairs });
  };

  const setPair = (
    pairId: string,
    changes: Partial<{ prompt: string; match: string }>,
  ): void => {
    setPairs(
      question.pairs.map((pair) =>
        pair.id === pairId ? { ...pair, ...changes } : pair,
      ),
    );
  };

  return (
    <div className="fq-subsection">
      <span className="fe-field-label">Pairs</span>
      {question.pairs.map((pair, index) => (
        <div key={pair.id} className="fq-item-row">
          <div className="fq-item-fields fq-item-fields-row">
            <TextField
              label={`Prompt ${index + 1}`}
              value={pair.prompt}
              onCommit={(value) => setPair(pair.id, { prompt: value })}
            />
            <TextField
              label={`Match ${index + 1}`}
              value={pair.match}
              onCommit={(value) => setPair(pair.id, { match: value })}
            />
          </div>
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            disabled={question.pairs.length <= 1}
            onClick={() =>
              setPairs(question.pairs.filter((item) => item.id !== pair.id))
            }
            title={
              question.pairs.length <= 1
                ? "At least one pair is required"
                : "Remove pair"
            }
            aria-label={`Remove pair ${index + 1}`}
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="fq-add-inline"
        onClick={() => {
          const n = question.pairs.length + 1;
          setPairs([
            ...question.pairs,
            { id: createUlid(), prompt: `Prompt ${n}`, match: `Match ${n}` },
          ]);
        }}
      >
        <Plus size={13} aria-hidden /> Add pair
      </button>
    </div>
  );
}

export function SequencingEditor({
  question,
  onCommit,
}: {
  question: SequencingQuestion;
  onCommit: (next: Question) => void;
}): ReactElement {
  const ordered = [...question.items].sort(
    (a, b) => a.correctOrder - b.correctOrder,
  );

  // correctOrder is always rewritten to the display index: 0-based contiguous.
  const commitItems = (items: SequencingQuestion["items"]): void => {
    onCommit({
      ...question,
      items: items.map((item, index) => ({ ...item, correctOrder: index })),
    });
  };

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    const moved = next[index];
    const other = next[target];
    if (!moved || !other) return;
    next[target] = moved;
    next[index] = other;
    commitItems(next);
  };

  return (
    <div className="fq-subsection">
      <span className="fe-field-label">Items (top to bottom = correct order)</span>
      {ordered.map((item, index) => (
        <div key={item.id} className="fq-item-row">
          <span className="fq-order-index">{index + 1}.</span>
          <div className="fq-item-fields">
            <QuizHtmlField
              label={`Item ${index + 1} (HTML)`}
              value={item.html}
              onCommit={(value) =>
                commitItems(
                  ordered.map((existing) =>
                    existing.id === item.id
                      ? { ...existing, html: value }
                      : existing,
                  ),
                )
              }
            />
          </div>
          <span className="fq-row-controls">
            <button
              type="button"
              className="fe-icon-btn fe-icon-btn-sm"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              title="Move item up"
              aria-label={`Move item ${index + 1} up`}
            >
              <ArrowUp size={13} aria-hidden />
            </button>
            <button
              type="button"
              className="fe-icon-btn fe-icon-btn-sm"
              disabled={index === ordered.length - 1}
              onClick={() => move(index, 1)}
              title="Move item down"
              aria-label={`Move item ${index + 1} down`}
            >
              <ArrowDown size={13} aria-hidden />
            </button>
            <button
              type="button"
              className="fe-icon-btn fe-icon-btn-sm"
              disabled={ordered.length <= 2}
              onClick={() =>
                commitItems(ordered.filter((existing) => existing.id !== item.id))
              }
              title={
                ordered.length <= 2
                  ? "At least two items are required"
                  : "Remove item"
              }
              aria-label={`Remove item ${index + 1}`}
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </span>
        </div>
      ))}
      <button
        type="button"
        className="fq-add-inline"
        onClick={() =>
          commitItems([
            ...ordered,
            {
              id: createUlid(),
              html: `<p>Step ${ordered.length + 1}</p>`,
              correctOrder: ordered.length,
            },
          ])
        }
      >
        <Plus size={13} aria-hidden /> Add item
      </button>
    </div>
  );
}

export function NumericEditor({
  question,
  onCommit,
}: {
  question: NumericQuestion;
  onCommit: (next: Question) => void;
}): ReactElement {
  const [rangeError, setRangeError] = useState<string | null>(null);
  const grading = question.grading;

  const commitGrading = (next: NumericQuestion["grading"]): void => {
    onCommit({ ...question, grading: next });
  };

  const setMode = (mode: "exact" | "range"): void => {
    if (grading.mode === mode) return;
    setRangeError(null);
    if (mode === "exact") {
      commitGrading({ mode: "exact", value: grading.mode === "range" ? grading.min : 0 });
    } else {
      const value = grading.mode === "exact" ? grading.value : 0;
      commitGrading({ mode: "range", min: value, max: value });
    }
  };

  const setRangePart = (part: "min" | "max", value: number): void => {
    if (grading.mode !== "range") return;
    const min = part === "min" ? value : grading.min;
    const max = part === "max" ? value : grading.max;
    if (min > max) {
      setRangeError("Minimum must be less than or equal to maximum.");
      return;
    }
    setRangeError(null);
    commitGrading({ mode: "range", min, max });
  };

  return (
    <div className="fq-subsection">
      <fieldset className="fq-mode">
        <legend className="fe-field-label">Grading mode</legend>
        <label className="fq-correct">
          <input
            type="radio"
            name={`fq-numeric-mode-${question.id}`}
            checked={grading.mode === "exact"}
            onChange={() => setMode("exact")}
          />
          <span>Exact value</span>
        </label>
        <label className="fq-correct">
          <input
            type="radio"
            name={`fq-numeric-mode-${question.id}`}
            checked={grading.mode === "range"}
            onChange={() => setMode("range")}
          />
          <span>Range</span>
        </label>
      </fieldset>
      {grading.mode === "exact" ? (
        <div className="fq-grid">
          <NumberField
            label="Correct value"
            value={grading.value}
            step="any"
            onCommit={(value) => {
              if (value === null) return;
              if (grading.tolerance === undefined) {
                commitGrading({ mode: "exact", value });
              } else {
                commitGrading({ mode: "exact", value, tolerance: grading.tolerance });
              }
            }}
          />
          <NumberField
            label="Tolerance (optional)"
            value={grading.tolerance ?? null}
            min={0}
            step="any"
            allowEmpty
            onCommit={(tolerance) => {
              if (tolerance === null) {
                commitGrading({ mode: "exact", value: grading.value });
              } else {
                commitGrading({ mode: "exact", value: grading.value, tolerance });
              }
            }}
          />
        </div>
      ) : (
        <div className="fq-grid">
          <NumberField
            label="Minimum"
            value={grading.min}
            step="any"
            onCommit={(value) => {
              if (value !== null) setRangePart("min", value);
            }}
          />
          <NumberField
            label="Maximum"
            value={grading.max}
            step="any"
            onCommit={(value) => {
              if (value !== null) setRangePart("max", value);
            }}
          />
        </div>
      )}
      <FieldError message={rangeError} />
    </div>
  );
}

export function LikertEditor({
  question,
  onCommit,
}: {
  question: LikertQuestion;
  onCommit: (next: Question) => void;
}): ReactElement {
  const setScale = (scale: LikertQuestion["scale"]): void => {
    onCommit({ ...question, scale });
  };

  return (
    <div className="fq-subsection">
      <span className="fe-field-label">Scale</span>
      {question.scale.map((step, index) => (
        <div key={step.id} className="fq-item-row">
          <div className="fq-item-fields fq-item-fields-row">
            <TextField
              label={`Label ${index + 1}`}
              value={step.label}
              onCommit={(label) =>
                setScale(
                  question.scale.map((item) =>
                    item.id === step.id ? { ...item, label } : item,
                  ),
                )
              }
            />
            <NumberField
              label="Value"
              value={step.value}
              step="any"
              onCommit={(value) => {
                if (value === null) return;
                setScale(
                  question.scale.map((item) =>
                    item.id === step.id ? { ...item, value } : item,
                  ),
                );
              }}
            />
          </div>
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            disabled={question.scale.length <= 2}
            onClick={() =>
              setScale(question.scale.filter((item) => item.id !== step.id))
            }
            title={
              question.scale.length <= 2
                ? "At least two scale points are required"
                : "Remove scale point"
            }
            aria-label={`Remove scale point ${index + 1}`}
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="fq-add-inline"
        onClick={() => {
          const maxValue = question.scale.reduce(
            (acc, item) => Math.max(acc, item.value),
            0,
          );
          setScale([
            ...question.scale,
            {
              id: createUlid(),
              label: `Option ${question.scale.length + 1}`,
              value: maxValue + 1,
            },
          ]);
        }}
      >
        <Plus size={13} aria-hidden /> Add scale point
      </button>
      <CheckboxField
        label="Response required"
        checked={question.required}
        onChange={(checked) => onCommit({ ...question, required: checked })}
      />
    </div>
  );
}

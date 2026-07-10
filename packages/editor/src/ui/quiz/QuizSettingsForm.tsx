// Quiz lesson settings form bound to quizLessonSettingsSchema. Every change
// goes through setQuizSettings, which validates the whole lesson; rejected
// edits surface the zod message inline and are not committed.
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Input } from "@forge/ui";
import type { QuizLesson } from "@forge/schema";
import { setQuizSettings } from "../../state/quizActions.js";
import type { QuizSettings } from "../../state/quizActions.js";
import { CheckboxField, FieldError, NumberField, SelectField } from "./fields.js";

const REVEAL_OPTIONS = [
  { value: "all", label: "After each question" },
  { value: "none", label: "Never" },
  { value: "afterFinalAttempt", label: "After the final attempt" },
] as const;

function TimeLimitField({
  totalSeconds,
  onCommit,
  readOnly = false,
}: {
  totalSeconds: number | null;
  onCommit: (value: number | null) => void;
  readOnly?: boolean;
}): ReactElement {
  const minutesText = totalSeconds === null ? "" : String(Math.floor(totalSeconds / 60));
  const secondsText = totalSeconds === null ? "" : String(totalSeconds % 60);
  const [minutes, setMinutes] = useState(minutesText);
  const [seconds, setSeconds] = useState(secondsText);
  useEffect(() => {
    setMinutes(minutesText);
    setSeconds(secondsText);
  }, [minutesText, secondsText]);

  const commitParts = (minutesRaw: string, secondsRaw: string): void => {
    if (minutesRaw.trim() === "" && secondsRaw.trim() === "") {
      onCommit(null);
      return;
    }
    const m = minutesRaw.trim() === "" ? 0 : Number(minutesRaw);
    const s = secondsRaw.trim() === "" ? 0 : Number(secondsRaw);
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0) return;
    const total = m * 60 + s;
    onCommit(total > 0 ? total : null);
  };

  return (
    <div className="fe-field">
      <span className="fe-field-label">Time limit (empty = none)</span>
      <div className="fq-time-limit">
        <label>
          <Input
            type="number"
            min={0}
            value={minutes}
            aria-label="Time limit minutes"
            readOnly={readOnly}
            onChange={(event) => {
              setMinutes(event.target.value);
              commitParts(event.target.value, seconds);
            }}
            onBlur={() => setMinutes(minutesText)}
          />
          <span className="fe-muted"> min</span>
        </label>
        <label>
          <Input
            type="number"
            min={0}
            max={59}
            value={seconds}
            aria-label="Time limit seconds"
            readOnly={readOnly}
            onChange={(event) => {
              setSeconds(event.target.value);
              commitParts(minutes, event.target.value);
            }}
            onBlur={() => setSeconds(secondsText)}
          />
          <span className="fe-muted"> sec</span>
        </label>
      </div>
    </div>
  );
}

export function QuizSettingsForm({
  lesson,
  readOnly = false,
}: {
  lesson: QuizLesson;
  readOnly?: boolean;
}): ReactElement {
  const [error, setError] = useState<string | null>(null);
  const settings = lesson.settings;

  const commit = (next: QuizSettings): void => {
    if (readOnly) return;
    setError(setQuizSettings(lesson.id, next));
  };

  const patch = (changes: Partial<QuizSettings>): void => {
    commit({ ...settings, ...changes });
  };

  const setOptional = (
    key: "questionPoolSize" | "timeLimitSeconds",
    value: number | null,
  ): void => {
    const next: QuizSettings = { ...settings };
    if (value === null) delete next[key];
    else next[key] = value;
    commit(next);
  };

  const unlimited = settings.retryCount === -1;

  return (
    <div className="fq-settings">
      <FieldError message={error} />
      <div className="fq-grid">
        <NumberField
          label="Passing score (%)"
          value={settings.passingScore}
          min={0}
          max={100}
          disabled={readOnly}
          onCommit={(value) => {
            if (value !== null) patch({ passingScore: value });
          }}
        />
        <div className="fq-stack">
          <NumberField
            label="Retries"
            value={unlimited ? null : settings.retryCount}
            min={0}
            disabled={readOnly || unlimited}
            onCommit={(value) => {
              if (value !== null) patch({ retryCount: value });
            }}
          />
          <CheckboxField
            label="Unlimited retries"
            checked={unlimited}
            disabled={readOnly}
            onChange={(checked) => patch({ retryCount: checked ? -1 : 0 })}
          />
        </div>
        <SelectField
          label="Reveal answers"
          value={settings.revealAnswers}
          options={REVEAL_OPTIONS}
          disabled={readOnly}
          onChange={(value) =>
            patch({ revealAnswers: value as QuizSettings["revealAnswers"] })
          }
        />
      </div>
      <div className="fq-grid">
        <CheckboxField
          label="Shuffle answer choices"
          checked={settings.shuffleAnswerChoices}
          disabled={readOnly}
          onChange={(checked) => patch({ shuffleAnswerChoices: checked })}
        />
        <CheckboxField
          label="Randomize question order"
          checked={settings.randomizeQuestionOrder}
          disabled={readOnly}
          onChange={(checked) => patch({ randomizeQuestionOrder: checked })}
        />
      </div>
      <div className="fq-grid">
        <div className="fq-stack">
          <NumberField
            label={`Question pool (draw N of ${lesson.questions.length})`}
            value={settings.questionPoolSize ?? null}
            min={1}
            allowEmpty
            disabled={readOnly}
            onCommit={(value) => setOptional("questionPoolSize", value)}
          />
          <p className="fe-muted fq-hint">Leave empty to use every question.</p>
        </div>
        <TimeLimitField
          totalSeconds={settings.timeLimitSeconds ?? null}
          readOnly={readOnly}
          onCommit={(value) => setOptional("timeLimitSeconds", value)}
        />
      </div>
    </div>
  );
}

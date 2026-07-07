// Shared draft-state form primitives for the quiz editor. Text and number
// fields keep a local draft, attempt a commit on every change (the commit is
// validated upstream and rejected edits show an inline message), and resync
// from the committed value on blur or external change (undo, duplicate...).
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { RichTextField } from "../rich/RichTextField.js";

export function FieldError({
  message,
}: {
  message: string | null;
}): ReactElement | null {
  if (!message) return null;
  return (
    <span className="fe-field-error" role="alert">
      {message}
    </span>
  );
}

export function TextField({
  label,
  value,
  onCommit,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
}): ReactElement {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
        onBlur={() => setDraft(value)}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onCommit,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  rows?: number;
  placeholder?: string;
}): ReactElement {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}</span>
      <textarea
        value={draft}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
        onBlur={() => setDraft(value)}
      />
    </label>
  );
}

/**
 * Sanitized rich-text field for quiz HTML values (prompt, rationale,
 * feedback), backed by TipTap. Keeps TextAreaField's call signature so quiz
 * editors can swap the tag name without other changes: rows and placeholder
 * are accepted but unused (the rich editor sizes itself and has no
 * placeholder extension yet). Commits are sanitizer-validated inside
 * RichTextField before onCommit fires, matching the validate-before-commit
 * convention.
 */
export function QuizHtmlField(props: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  rows?: number;
  placeholder?: string;
}): ReactElement {
  return <RichTextField label={props.label} value={props.value} onCommit={props.onCommit} />;
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step,
  disabled,
  allowEmpty,
}: {
  label: string;
  /** null renders an empty input (used for optional keys). */
  value: number | null;
  onCommit: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  disabled?: boolean;
  /** When true, emptying the input commits null (caller omits the key). */
  allowEmpty?: boolean;
}): ReactElement {
  const text = value === null ? "" : String(value);
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw.trim() === "") {
            if (allowEmpty) onCommit(null);
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) onCommit(parsed);
        }}
        onBlur={() => setDraft(text)}
      />
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <label className="fe-field-checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// FormField: label + optional hint + error slot around any single control.
// Wires ids for aria-describedby / aria-invalid onto the child (Input,
// Textarea, Select, or anything accepting id + aria props) and paints the
// invalid border via .an-field[data-invalid] so the child needs no extra prop.
import type { ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement, useId } from "react";
import { cx } from "./util.js";

interface InjectedControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface FormFieldProps {
  label: ReactNode;
  /** Persistent help text under the control. */
  hint?: ReactNode;
  /** Error message; presence switches the field invalid. */
  error?: ReactNode;
  /** Marks the label with a required indicator and sets aria-required. */
  required?: boolean;
  /** Exactly one control element (Input, Textarea, Select, ...). */
  children: ReactElement<InjectedControlProps & { "aria-required"?: boolean }>;
  className?: string;
  /** Override the generated control id (must match the child's own id). */
  id?: string;
}

export function FormField({
  label,
  hint,
  error,
  required = false,
  children,
  className,
  id,
}: FormFieldProps): ReactElement {
  const autoId = useId();
  const controlId = id ?? `an-field-${autoId}`;
  const hintId = hint !== undefined ? `${controlId}-hint` : undefined;
  const errorId = error !== undefined && error !== null ? `${controlId}-error` : undefined;
  // The error replaces the hint visually, so only the rendered node describes.
  const describedBy = errorId ?? hintId;
  const invalid = errorId !== undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        ...(describedBy !== undefined ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": true } : {}),
        ...(required ? { "aria-required": true } : {}),
      })
    : children;

  return (
    <div
      className={cx("an-field", className)}
      data-invalid={invalid ? "" : undefined}
    >
      <label className="an-field-label an-type-label" htmlFor={controlId}>
        {label}
        {required ? (
          <span className="an-field-required" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {control}
      {errorId !== undefined ? (
        <div className="an-field-error" id={errorId} role="alert">
          {error}
        </div>
      ) : hintId !== undefined ? (
        <div className="an-field-hint" id={hintId}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

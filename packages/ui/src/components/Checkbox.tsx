import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";

export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<"input">, "type" | "size"> {
  /** Visible label text; omit only when labelled externally. */
  label?: ReactNode;
}

export function Checkbox({
  label,
  className,
  ...rest
}: CheckboxProps): ReactElement {
  return (
    <label className={cx("an-checkbox", className)}>
      <input {...rest} type="checkbox" className="an-checkbox-input" />
      <span className="an-checkbox-box" aria-hidden>
        <svg viewBox="0 0 12 12" width="10" height="10">
          <path
            d="M2.5 6.5l2.2 2.2L9.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label !== undefined ? (
        <span className="an-checkbox-label">{label}</span>
      ) : null}
    </label>
  );
}

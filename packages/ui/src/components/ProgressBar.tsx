import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";

export interface ProgressBarProps extends ComponentPropsWithRef<"div"> {
  /** 0-100. Omit for an indeterminate bar. */
  value?: number;
  /** Accessible name. */
  label?: string;
  /** Ember accent instead of cobalt (warm progress emphasis). */
  accent?: boolean;
}

export function ProgressBar({
  value,
  label,
  accent = false,
  className,
  ...rest
}: ProgressBarProps): ReactElement {
  const clamped =
    value === undefined ? undefined : Math.min(100, Math.max(0, value));
  return (
    <div
      {...rest}
      className={cx("an-progressbar", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      data-indeterminate={clamped === undefined ? "" : undefined}
      data-accent={accent ? "" : undefined}
    >
      <div
        className="an-progressbar-fill"
        style={clamped === undefined ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}

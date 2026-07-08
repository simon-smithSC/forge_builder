import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  /** Marks the field invalid (danger border plus aria-invalid). */
  invalid?: boolean;
}

export function Textarea({
  invalid = false,
  className,
  ...rest
}: TextareaProps): ReactElement {
  return (
    <textarea
      {...rest}
      className={cx("an-textarea", className)}
      data-invalid={invalid ? "" : undefined}
      aria-invalid={invalid || undefined}
    />
  );
}

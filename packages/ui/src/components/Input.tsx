import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";
import type { ControlSize } from "./util.js";

export interface InputProps
  extends Omit<ComponentPropsWithRef<"input">, "size"> {
  size?: ControlSize;
  /** Marks the field invalid (danger border plus aria-invalid). */
  invalid?: boolean;
}

export function Input({
  size = "md",
  invalid = false,
  className,
  ...rest
}: InputProps): ReactElement {
  return (
    <input
      {...rest}
      className={cx("an-input", className)}
      data-size={size}
      data-invalid={invalid ? "" : undefined}
      aria-invalid={invalid || undefined}
    />
  );
}

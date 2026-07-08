import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";
import type { ControlSize } from "./util.js";

export interface SelectProps
  extends Omit<ComponentPropsWithRef<"select">, "size"> {
  size?: ControlSize;
  invalid?: boolean;
}

/** Styled native select: wrapper adds the chevron; semantics stay native. */
export function Select({
  size = "md",
  invalid = false,
  className,
  children,
  ...rest
}: SelectProps): ReactElement {
  return (
    <span className={cx("an-select", className)} data-size={size}>
      <select
        {...rest}
        data-invalid={invalid ? "" : undefined}
        aria-invalid={invalid || undefined}
      >
        {children}
      </select>
      <svg
        className="an-select-chevron"
        aria-hidden
        viewBox="0 0 16 16"
        width="14"
        height="14"
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

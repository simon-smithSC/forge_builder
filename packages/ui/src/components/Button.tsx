import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";
import type { ControlSize } from "./util.js";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: ControlSize;
  /** Shows a spinner, disables the control, sets aria-busy. */
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  iconStart,
  iconEnd,
  disabled,
  className,
  children,
  type,
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      {...rest}
      type={type ?? "button"}
      className={cx("an-btn", className)}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "" : undefined}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="an-spinner" aria-hidden />
      ) : iconStart !== undefined ? (
        <span className="an-btn-icon" aria-hidden>
          {iconStart}
        </span>
      ) : null}
      <span className="an-btn-label">{children}</span>
      {iconEnd !== undefined ? (
        <span className="an-btn-icon" aria-hidden>
          {iconEnd}
        </span>
      ) : null}
    </button>
  );
}

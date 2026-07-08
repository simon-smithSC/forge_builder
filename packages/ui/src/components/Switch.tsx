import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";

export interface SwitchProps
  extends Omit<ComponentPropsWithRef<"button">, "onChange" | "children"> {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  size?: "sm" | "md";
}

/** APG switch pattern: button with role=switch and aria-checked. */
export function Switch({
  checked,
  onCheckedChange,
  size = "md",
  className,
  disabled,
  onClick,
  ...rest
}: SwitchProps): ReactElement {
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cx("an-switch", className)}
      data-size={size}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
    >
      <span className="an-switch-thumb" aria-hidden />
    </button>
  );
}

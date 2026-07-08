import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";
import type { ControlSize } from "./util.js";

export interface IconButtonProps
  extends Omit<ComponentPropsWithRef<"button">, "children" | "aria-label"> {
  /** Required accessible name; icon-only controls have no visible label. */
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "secondary" | "danger";
  size?: ControlSize;
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className,
  type,
  ...rest
}: IconButtonProps): ReactElement {
  return (
    <button
      {...rest}
      type={type ?? "button"}
      className={cx("an-iconbtn", className)}
      data-variant={variant}
      data-size={size}
      aria-label={label}
      title={rest.title ?? label}
    >
      <span className="an-iconbtn-glyph" aria-hidden>
        {icon}
      </span>
    </button>
  );
}

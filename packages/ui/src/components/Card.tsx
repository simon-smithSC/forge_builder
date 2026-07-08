import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";

export type CardElevation = 0 | 1 | 2 | 3 | 4;

export interface CardProps extends ComponentPropsWithRef<"div"> {
  /** Elevation level 0-4 (canvas, card, raised, popover, dialog). */
  elevation?: CardElevation;
  /** Hover lifts one elevation step; pressed compresses. */
  interactive?: boolean;
}

export function Card({
  elevation = 1,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps): ReactElement {
  return (
    <div
      {...rest}
      className={cx("an-card", className)}
      data-elevation={elevation}
      data-interactive={interactive ? "" : undefined}
    >
      {children}
    </div>
  );
}

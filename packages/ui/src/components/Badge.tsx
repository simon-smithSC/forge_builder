import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";
import type { Tone } from "./util.js";

export interface BadgeProps extends ComponentPropsWithRef<"span"> {
  tone?: Tone;
  /** Monospace rendering for IDs, counts, and technical detail. */
  mono?: boolean;
}

export function Badge({
  tone = "neutral",
  mono = false,
  className,
  children,
  ...rest
}: BadgeProps): ReactElement {
  return (
    <span
      {...rest}
      className={cx("an-badge", className)}
      data-tone={tone}
      data-mono={mono ? "" : undefined}
    >
      {children}
    </span>
  );
}

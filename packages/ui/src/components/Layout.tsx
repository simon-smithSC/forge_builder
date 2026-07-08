// Layout primitives: Stack (vertical rhythm), Inline (horizontal wrap),
// Divider. Gap values are space-token steps so spacing stays on the 4px grid.
import type { ComponentPropsWithRef, ReactElement } from "react";
import { cx } from "./util.js";

/** Space-token steps (px reference on the 4px grid). */
export type SpaceStep = 0 | 2 | 4 | 6 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64;

function gapVar(step: SpaceStep): string {
  return `var(--an-space-${step})`;
}

export interface StackProps extends ComponentPropsWithRef<"div"> {
  /** Vertical gap between children, space-token step. Default 12. */
  gap?: SpaceStep;
  /** Cross-axis alignment. Default stretch. */
  align?: "start" | "center" | "end" | "stretch";
}

export function Stack({
  gap = 12,
  align = "stretch",
  className,
  style,
  ...rest
}: StackProps): ReactElement {
  return (
    <div
      {...rest}
      className={cx("an-stack", className)}
      style={{ gap: gapVar(gap), alignItems: align, ...style }}
    />
  );
}

export interface InlineProps extends ComponentPropsWithRef<"div"> {
  /** Gap between children, space-token step. Default 8. */
  gap?: SpaceStep;
  /** Cross-axis alignment. Default center. */
  align?: "start" | "center" | "end" | "baseline";
  /** Wrap onto new lines. Default true. */
  wrap?: boolean;
}

export function Inline({
  gap = 8,
  align = "center",
  wrap = true,
  className,
  style,
  ...rest
}: InlineProps): ReactElement {
  return (
    <div
      {...rest}
      className={cx("an-inline", className)}
      style={{
        gap: gapVar(gap),
        alignItems: align,
        flexWrap: wrap ? "wrap" : "nowrap",
        ...style,
      }}
    />
  );
}

export interface DividerProps extends ComponentPropsWithRef<"hr"> {
  /** Default horizontal. Vertical dividers stretch to the flex row height. */
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  orientation = "horizontal",
  className,
  ...rest
}: DividerProps): ReactElement {
  return (
    <hr
      {...rest}
      className={cx("an-divider", className)}
      data-orientation={orientation}
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
    />
  );
}

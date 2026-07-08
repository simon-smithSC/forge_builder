import type { CSSProperties, ReactElement } from "react";
import { cx } from "./util.js";

export interface SkeletonProps {
  variant?: "text" | "rect" | "circle";
  /** CSS width, e.g. "12rem" or "100%". */
  width?: string;
  /** CSS height; text variant defaults to one line. */
  height?: string;
  className?: string;
}

/** Loading placeholder. Shimmer collapses under prefers-reduced-motion. */
export function Skeleton({
  variant = "text",
  width,
  height,
  className,
}: SkeletonProps): ReactElement {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;
  return (
    <span
      className={cx("an-skeleton", className)}
      data-variant={variant}
      style={style}
      aria-hidden
    />
  );
}

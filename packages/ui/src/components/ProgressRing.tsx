import type { ReactElement } from "react";
import { cx } from "./util.js";

export interface ProgressRingProps {
  /** 0-100. */
  value: number;
  /** Outer size in px. */
  size?: number;
  strokeWidth?: number;
  /** Accessible name. */
  label?: string;
  /** Ember accent instead of cobalt. */
  accent?: boolean;
  className?: string;
}

export function ProgressRing({
  value,
  size = 32,
  strokeWidth = 3,
  label,
  accent = false,
  className,
}: ProgressRingProps): ReactElement {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      className={cx("an-progressring", className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      data-accent={accent ? "" : undefined}
    >
      <circle
        className="an-progressring-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
      />
      <circle
        className="an-progressring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

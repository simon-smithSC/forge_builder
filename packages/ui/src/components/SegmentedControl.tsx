import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";
import type { ControlSize } from "./util.js";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name for the group. */
  label?: string;
  size?: ControlSize;
  className?: string;
}

/** Mutually exclusive segments; radiogroup semantics with arrow-key cycling. */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  label,
  size = "md",
  className,
}: SegmentedControlProps): ReactElement {
  const enabled = options.filter((o) => o.disabled !== true);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = enabled.findIndex((o) => o.value === value);
    let next: SegmentedOption | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = enabled[(current + 1) % enabled.length];
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = enabled[(current - 1 + enabled.length) % enabled.length];
    if (next) {
      event.preventDefault();
      onValueChange(next.value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx("an-segmented", className)}
      data-size={size}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={option.disabled}
            className="an-segment"
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

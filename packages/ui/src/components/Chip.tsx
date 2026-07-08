import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";

export interface ChipProps
  extends Omit<ComponentPropsWithRef<"button">, "children"> {
  children: ReactNode;
  selected?: boolean;
  /** Renders a remove affordance inside the chip. */
  onRemove?: (() => void) | undefined;
}

/** Interactive pill: filters, rail chips, removable selections. */
export function Chip({
  selected = false,
  onRemove,
  className,
  children,
  type,
  ...rest
}: ChipProps): ReactElement {
  return (
    <span className={cx("an-chip", className)} data-selected={selected ? "" : undefined}>
      <button
        {...rest}
        type={type ?? "button"}
        className="an-chip-body"
        aria-pressed={selected}
      >
        {children}
      </button>
      {onRemove !== undefined ? (
        <button
          type="button"
          className="an-chip-remove"
          aria-label="Remove"
          onClick={onRemove}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

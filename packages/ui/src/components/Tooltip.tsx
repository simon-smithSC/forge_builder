import type { ReactElement, ReactNode } from "react";
import { useId, useState } from "react";
import { cx } from "./util.js";

export interface TooltipProps {
  /** Short text; anything longer belongs in a Popover. */
  content: string;
  children: ReactNode;
  placement?: "top" | "bottom";
  className?: string;
}

/**
 * Hover/focus tooltip. The wrapper span carries aria-describedby and relays
 * focus events bubbling from the child control; Escape dismisses.
 */
export function Tooltip({
  content,
  children,
  placement = "top",
  className,
}: TooltipProps): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cx("an-tooltip-anchor", className)}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {children}
      {open ? (
        <span id={id} role="tooltip" className="an-tooltip" data-placement={placement}>
          {content}
        </span>
      ) : null}
    </span>
  );
}

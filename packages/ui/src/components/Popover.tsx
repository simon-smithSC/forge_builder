import type { ReactElement, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cx } from "./util.js";
import { Presence } from "./Presence.js";

export type PopoverPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger element the panel anchors to. */
  anchor: ReactNode;
  children: ReactNode;
  placement?: PopoverPlacement;
  className?: string;
  /** Accessible name for the panel. */
  label?: string;
}

/** Anchored floating panel. Dismisses on outside pointer-down and Escape. */
export function Popover({
  open,
  onClose,
  anchor,
  children,
  placement = "bottom-start",
  className,
  label,
}: PopoverProps): ReactElement {
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        onClose();
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <span className="an-popover-anchor" ref={rootRef}>
      {anchor}
      {/* Presence holds the panel mounted through the [data-state="closed"]
          exit transition; the enter keyframe still fires on mount as before.
          Dismiss listeners are gated on `open`, so a closing panel cannot
          swallow outside clicks (CSS also sets pointer-events: none). */}
      <Presence open={open}>
        {(presence) => (
          <div
            ref={presence.ref}
            data-state={presence["data-state"]}
            className={cx("an-popover", className)}
            data-placement={placement}
            role="dialog"
            aria-label={label}
          >
            {children}
          </div>
        )}
      </Presence>
    </span>
  );
}

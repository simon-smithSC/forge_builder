// Accessible modal dialog. Ports the proven bones of the editor's
// dialogs/Dialog.tsx: role=dialog + aria-modal, focus moves in on open and
// restores on close, Tab/Shift+Tab trap, Escape closes (stopPropagation so a
// nested dialog does not close its parent), backdrop mousedown closes.
// Motion M3: an optional `open` prop (default true, so mount-controlled
// callers are unchanged) puts a Presence around the overlay — flipping it
// false plays the [data-state="closed"] backdrop fade + panel sink before the
// DOM detaches. Focus restores the moment close STARTS, not after the exit,
// so keyboard users are never stranded in a fading ghost; Escape, the trap
// and backdrop clicks are ignored while closing.
import type {
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import { useEffect, useId, useRef } from "react";
import { cx } from "./util.js";
import { IconButton } from "./IconButton.js";
import { Presence } from "./Presence.js";
import type { PresenceChildProps } from "./Presence.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * Exit-animation control. Omit it (default true) to keep the classic
   * mount/unmount contract; pass a boolean and keep the Dialog rendered to
   * get the closing transition, then drop it after `onExited` if desired.
   */
  open?: boolean;
  /** Fires when the exit transition ends and the overlay has left the DOM. */
  onExited?: (() => void) | undefined;
  width?: "sm" | "md" | "lg";
  /** Optional action row pinned to the bottom of the panel. */
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open = true, onExited, ...rest }: DialogProps): ReactElement | null {
  return (
    <Presence open={open} onExited={onExited}>
      {(presence) => <DialogOverlay presence={presence} open={open} {...rest} />}
    </Presence>
  );
}

function DialogOverlay({
  presence,
  open,
  title,
  onClose,
  children,
  width = "md",
  footer,
  className,
}: Omit<DialogProps, "open" | "onExited"> & {
  presence: PresenceChildProps;
  open: boolean;
}): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const restoredRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }
    return () => {
      // Mount-controlled callers unmount while open: restore here as before.
      // Open-controlled callers already restored when close started.
      if (restoredRef.current) return;
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (open) {
      if (restoredRef.current) {
        // Reopened mid-exit: move focus back into the panel.
        restoredRef.current = false;
        const panel = panelRef.current;
        const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? panel)?.focus();
      }
      return;
    }
    // Close started: restore focus NOW, while the exit transition plays.
    restoredRef.current = true;
    const previous = previousFocusRef.current;
    if (previous instanceof HTMLElement) previous.focus();
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!open) return; // closing: inert to Escape and the tab trap
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>): void => {
    if (!open) return;
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      ref={presence.ref}
      data-state={presence["data-state"]}
      className="an-dialog-backdrop"
      {...(open ? {} : { inert: true })}
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className={cx("an-dialog", className)}
        data-state={presence["data-state"]}
        data-width={width}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="an-dialog-header">
          <h2 id={titleId} className="an-dialog-title">
            {title}
          </h2>
          <IconButton
            label="Close dialog"
            onClick={onClose}
            icon={
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </div>
        <div className="an-dialog-body">{children}</div>
        {footer !== undefined ? (
          <div className="an-dialog-footer">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

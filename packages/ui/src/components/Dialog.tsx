// Accessible modal dialog. Ports the proven bones of the editor's
// dialogs/Dialog.tsx: role=dialog + aria-modal, focus moves in on open and
// restores on close, Tab/Shift+Tab trap, Escape closes (stopPropagation so a
// nested dialog does not close its parent), backdrop mousedown closes.
import type {
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import { useEffect, useId, useRef } from "react";
import { cx } from "./util.js";
import { IconButton } from "./IconButton.js";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  /** Optional action row pinned to the bottom of the panel. */
  footer?: ReactNode;
  className?: string;
}

export function Dialog({
  title,
  onClose,
  children,
  width = "md",
  footer,
  className,
}: DialogProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }
    return () => {
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
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
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="an-dialog-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className={cx("an-dialog", className)}
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

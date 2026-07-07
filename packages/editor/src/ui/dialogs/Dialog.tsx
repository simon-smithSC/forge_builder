// Shared accessible modal wrapper for the course-level tool dialogs.
// Overlay + panel, role=dialog/aria-modal, Escape closes, click-outside
// closes, focus moves into the panel on open and restores on close, and a
// basic Tab/Shift+Tab focus trap.
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import "./dialogs.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional extra class on the panel, e.g. for wider dialogs. */
  panelClassName?: string;
}

export function Dialog({
  title,
  onClose,
  children,
  panelClassName,
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
      // Stop here so a nested dialog does not also close its parent.
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
      className="fe-dlg-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className={`fe-dlg${panelClassName ? ` ${panelClassName}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="fe-dlg-header">
          <h2 id={titleId} className="fe-dlg-title">
            {title}
          </h2>
          <button
            type="button"
            className="fe-icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close dialog"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="fe-dlg-body">{children}</div>
      </div>
    </div>
  );
}

import type {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  ReactElement,
} from "react";
import { useRef } from "react";
import { cx } from "./util.js";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ToolbarProps extends ComponentPropsWithoutRef<"div"> {
  /** Accessible name for the toolbar. */
  label?: string;
}

/** APG toolbar: one tab stop, ArrowLeft/ArrowRight move between controls. */
export function Toolbar({
  label,
  className,
  children,
  onKeyDown,
  ...rest
}: ToolbarProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = items[(current + delta + items.length) % items.length];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <div
      {...rest}
      ref={ref}
      role="toolbar"
      aria-label={label}
      className={cx("an-toolbar", className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

export function ToolbarSeparator(): ReactElement {
  return <div className="an-toolbar-separator" role="separator" aria-orientation="vertical" />;
}

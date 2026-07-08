import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import type { CSSProperties } from "react";
import { cx } from "./util.js";
import { IconButton } from "./IconButton.js";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Which edge the panel is attached to. */
  side?: "left" | "right";
  /** Panel width in px; animates open/closed. */
  width?: number;
  title?: string;
  className?: string;
}

/**
 * Non-modal side panel (settings rail). Width animates between 0 and the
 * target width; Escape inside the panel closes it. For modal flows use Dialog.
 */
export function Drawer({
  open,
  onClose,
  children,
  side = "right",
  width = 320,
  title,
  className,
}: DrawerProps): ReactElement {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <aside
      className={cx("an-drawer", className)}
      data-side={side}
      data-open={open ? "" : undefined}
      style={{ "--an-drawer-width": `${width}px` } as CSSProperties}
      aria-hidden={open ? undefined : true}
      aria-label={title}
      onKeyDown={handleKeyDown}
    >
      <div className="an-drawer-inner" {...(open ? {} : { inert: true })}>
        <div className="an-drawer-header">
          {title !== undefined ? (
            <h2 className="an-drawer-title">{title}</h2>
          ) : (
            <span />
          )}
          <IconButton
            label="Close panel"
            onClick={onClose}
            size="sm"
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
        <div className="an-drawer-body">{children}</div>
      </div>
    </aside>
  );
}

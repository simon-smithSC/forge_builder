import type { ReactElement, ReactNode } from "react";
import { cx } from "./util.js";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Usually a Button pointing at the primary next step. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps): ReactElement {
  return (
    <div className={cx("an-empty", className)}>
      {icon !== undefined ? (
        <div className="an-empty-icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <div className="an-empty-title">{title}</div>
      {description !== undefined ? (
        <div className="an-empty-description">{description}</div>
      ) : null}
      {action !== undefined ? (
        <div className="an-empty-action">{action}</div>
      ) : null}
    </div>
  );
}

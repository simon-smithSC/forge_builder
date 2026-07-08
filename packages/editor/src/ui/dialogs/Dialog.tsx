// Thin wrapper over the Anvil design-system Dialog. Preserves the original
// fe-dlg caller API ({ title, onClose, children, panelClassName }) so the
// course-tool dialogs compile unchanged; Anvil owns the backdrop, focus
// trap, Escape handling (with stopPropagation for nested dialogs), and the
// header close button.
import type { ReactElement, ReactNode } from "react";
import { Dialog as AnvilDialog } from "@forge/ui";
import "./dialogs.css";

export interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional extra class on the panel, e.g. for wider dialogs. */
  panelClassName?: string;
  /** Exit-animation control (motion M3); omit for mount/unmount callers. */
  open?: boolean;
  /** Fires after the exit transition when the overlay leaves the DOM. */
  onExited?: (() => void) | undefined;
}

export function Dialog({
  title,
  onClose,
  children,
  panelClassName,
  open,
  onExited,
}: DialogProps): ReactElement {
  const width = panelClassName?.includes("fe-dlg-wide") ? "lg" : "md";
  return (
    <AnvilDialog
      title={title}
      onClose={onClose}
      width={width}
      {...(open !== undefined ? { open } : {})}
      onExited={onExited}
      {...(panelClassName !== undefined ? { className: panelClassName } : {})}
    >
      {children}
    </AnvilDialog>
  );
}

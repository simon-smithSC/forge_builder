// P4 tier 1: compact quick-add strip. Opens as a popover anchored at the
// insertion point (NOT a modal) when the author clicks a plus affordance.
// Icon+label chips for the teardown's most-used blocks, plus an "All blocks"
// chip that opens the full BlockLibrary. Escape/click-away dismisses;
// selecting inserts a specific family+variant at the recorded index.
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { Chip, Icon } from "@forge/ui";
import type { PresenceChildProps } from "@forge/ui";
import { insertBlockVariant } from "../../state/libraryActions.js";
import { blockIcon } from "../blockIcons.js";
import { quickAddItems, recordRecentPick } from "./libraryData.js";
import "./library.css";

export interface QuickAddStripProps {
  lessonId: string;
  index: number;
  onOpenLibrary: () => void;
  onClose: () => void;
  /** Exit plumbing from the Presence at the mount site (motion M5). */
  presence: PresenceChildProps;
}

export function QuickAddStrip({
  lessonId,
  index,
  onOpenLibrary,
  onClose,
  presence,
}: QuickAddStripProps): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const closing = presence["data-state"] === "closed";

  // Focus the first chip on open; dismiss on click-away. Both are gated off
  // while the strip plays its exit, so a fading strip cannot steal focus or
  // dismiss whatever the author moved on to (e.g. the full library).
  useEffect(() => {
    if (closing) return;
    ref.current?.querySelector("button")?.focus();
    const onPointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose, closing]);

  const moveFocus = (delta: number): void => {
    const root = ref.current;
    if (!root) return;
    const chips = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
    const active = document.activeElement;
    const at = chips.findIndex((chip) => chip === active);
    const next = chips[(at + delta + chips.length) % chips.length];
    next?.focus();
  };

  return (
    <div
      ref={(node) => {
        ref.current = node;
        presence.ref(node);
      }}
      data-state={presence["data-state"]}
      className="fe-lib-strip"
      role="menu"
      aria-label="Quick add block"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          moveFocus(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(-1);
        }
      }}
    >
      <Chip
        role="menuitem"
        className="fe-lib-chip-library"
        onClick={onOpenLibrary}
      >
        <Icon name="layout-grid" size={14} />
        <span>All blocks</span>
      </Chip>
      <span className="fe-lib-strip-rule" aria-hidden />
      {quickAddItems.map((item) => {
        const Icon = blockIcon(item.icon);
        return (
          <Chip
            key={item.label}
            role="menuitem"
            onClick={() => {
              insertBlockVariant(lessonId, item.family, item.variant, index);
              recordRecentPick(item.family, item.variant);
              onClose();
            }}
          >
            <Icon size={14} aria-hidden />
            <span>{item.label}</span>
          </Chip>
        );
      })}
    </div>
  );
}

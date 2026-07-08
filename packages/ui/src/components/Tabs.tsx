import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { useId } from "react";
import { cx } from "./util.js";

export interface TabItem {
  id: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  /** Accessible name for the tablist. */
  label?: string;
  /** Stable id prefix linking tabs to panels; pass the same to TabPanel. */
  idPrefix?: string;
  className?: string;
}

/** APG tabs pattern, automatic activation: arrows move and select. */
export function Tabs({
  tabs,
  value,
  onValueChange,
  label,
  idPrefix,
  className,
}: TabsProps): ReactElement {
  const autoId = useId();
  const prefix = idPrefix ?? autoId;
  const enabled = tabs.filter((tab) => tab.disabled !== true);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = enabled.findIndex((tab) => tab.id === value);
    let next: TabItem | undefined;
    if (event.key === "ArrowRight") next = enabled[(current + 1) % enabled.length];
    else if (event.key === "ArrowLeft")
      next = enabled[(current - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    if (next) {
      event.preventDefault();
      onValueChange(next.id);
      document.getElementById(`${prefix}-tab-${next.id}`)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx("an-tabs", className)}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${prefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${prefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            className="an-tab"
            onClick={() => onValueChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  /** The tab id this panel belongs to. */
  tabId: string;
  /** Currently selected tab id (panel hides itself otherwise). */
  value: string;
  /** Must match the idPrefix passed to Tabs. */
  idPrefix: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({
  tabId,
  value,
  idPrefix,
  children,
  className,
}: TabPanelProps): ReactElement {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabId}`}
      aria-labelledby={`${idPrefix}-tab-${tabId}`}
      hidden={tabId !== value}
      tabIndex={0}
      className={cx("an-tabpanel", className)}
    >
      {children}
    </div>
  );
}

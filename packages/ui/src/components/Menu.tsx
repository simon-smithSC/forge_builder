import type {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  ReactElement,
} from "react";
import { useEffect, useRef } from "react";
import { cx } from "./util.js";

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

export interface MenuProps extends ComponentPropsWithoutRef<"div"> {
  /** Accessible name for the menu. */
  label?: string;
}

/**
 * APG menu pattern with roving tabindex: ArrowUp/ArrowDown move focus with
 * wrap, Home/End jump. Compose with MenuItem and MenuSeparator; place inside
 * a Popover for anchored context menus.
 */
export function Menu({
  label,
  className,
  children,
  onKeyDown,
  ...rest
}: MenuProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  const items = (): HTMLElement[] =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);

  const setRoving = (target: HTMLElement): void => {
    for (const item of items()) item.tabIndex = item === target ? 0 : -1;
    target.focus();
  };

  useEffect(() => {
    const all = items();
    all.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
    });
    all[0]?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const all = items();
    if (all.length === 0) return;
    const current = all.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (event.key === "ArrowDown") next = all[(current + 1) % all.length];
    else if (event.key === "ArrowUp")
      next = all[(current - 1 + all.length) % all.length];
    else if (event.key === "Home") next = all[0];
    else if (event.key === "End") next = all[all.length - 1];
    if (next) {
      event.preventDefault();
      setRoving(next);
    }
  };

  return (
    <div
      {...rest}
      ref={ref}
      role="menu"
      aria-label={label}
      className={cx("an-menu", className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

export interface MenuItemProps
  extends Omit<ComponentPropsWithoutRef<"button">, "onSelect"> {
  danger?: boolean;
  onSelect?: (() => void) | undefined;
}

export function MenuItem({
  danger = false,
  onSelect,
  className,
  children,
  onClick,
  type,
  ...rest
}: MenuItemProps): ReactElement {
  return (
    <button
      {...rest}
      type={type ?? "button"}
      role="menuitem"
      tabIndex={-1}
      className={cx("an-menu-item", className)}
      data-danger={danger ? "" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

export function MenuSeparator(): ReactElement {
  return <div className="an-menu-separator" role="separator" />;
}

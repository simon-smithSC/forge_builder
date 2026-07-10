import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";

export interface AppShellProps extends ComponentPropsWithRef<"div"> {
  topBar?: ReactNode;
}

export function AppShell({
  topBar,
  className,
  children,
  ...rest
}: AppShellProps): ReactElement {
  return (
    <div {...rest} className={cx("an-app-shell", className)}>
      {topBar !== undefined ? <div className="an-app-shell-top">{topBar}</div> : null}
      <div className="an-app-shell-body">{children}</div>
    </div>
  );
}

export interface ShellTopBarProps
  extends Omit<ComponentPropsWithRef<"header">, "title"> {
  title: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function ShellTopBar({
  title,
  leading,
  meta,
  actions,
  className,
  children,
  ...rest
}: ShellTopBarProps): ReactElement {
  return (
    <header {...rest} className={cx("an-shell-topbar", className)}>
      {leading !== undefined ? <div className="an-shell-topbar-leading">{leading}</div> : null}
      <div className="an-shell-topbar-title">
        <div className="an-shell-topbar-name">{title}</div>
        {meta !== undefined ? <div className="an-shell-topbar-meta">{meta}</div> : null}
      </div>
      {children !== undefined ? <div className="an-shell-topbar-content">{children}</div> : null}
      {actions !== undefined ? <div className="an-shell-topbar-actions">{actions}</div> : null}
    </header>
  );
}

export interface ShellSidebarProps extends ComponentPropsWithRef<"aside"> {
  label: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function ShellSidebar({
  label,
  header,
  footer,
  className,
  children,
  ...rest
}: ShellSidebarProps): ReactElement {
  return (
    <aside {...rest} className={cx("an-shell-sidebar", className)} aria-label={label}>
      {header !== undefined ? <div className="an-shell-region-header">{header}</div> : null}
      <div className="an-shell-region-body">{children}</div>
      {footer !== undefined ? <div className="an-shell-region-footer">{footer}</div> : null}
    </aside>
  );
}

export type ShellMainProps = ComponentPropsWithRef<"main">;

export function ShellMain({
  className,
  ...rest
}: ShellMainProps): ReactElement {
  return <main {...rest} className={cx("an-shell-main", className)} />;
}

export interface ShellRailProps extends ComponentPropsWithRef<"aside"> {
  label: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function ShellRail({
  label,
  header,
  footer,
  className,
  children,
  ...rest
}: ShellRailProps): ReactElement {
  return (
    <aside {...rest} className={cx("an-shell-rail", className)} aria-label={label}>
      {header !== undefined ? <div className="an-shell-region-header">{header}</div> : null}
      <div className="an-shell-region-body">{children}</div>
      {footer !== undefined ? <div className="an-shell-region-footer">{footer}</div> : null}
    </aside>
  );
}

export interface StatusBannerProps
  extends Omit<ComponentPropsWithRef<"div">, "title"> {
  tone?: "info" | "success" | "warn" | "danger";
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function StatusBanner({
  tone = "info",
  title,
  icon,
  actions,
  className,
  children,
  ...rest
}: StatusBannerProps): ReactElement {
  return (
    <div {...rest} className={cx("an-status-banner", className)} data-tone={tone}>
      {icon !== undefined ? <div className="an-status-banner-icon">{icon}</div> : null}
      <div className="an-status-banner-copy">
        {title !== undefined ? <div className="an-status-banner-title">{title}</div> : null}
        {children !== undefined ? <div className="an-status-banner-body">{children}</div> : null}
      </div>
      {actions !== undefined ? <div className="an-status-banner-actions">{actions}</div> : null}
    </div>
  );
}

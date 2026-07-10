import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { ProgressBar } from "./ProgressBar.js";
import { cx } from "./util.js";

export interface InspectorRailProps
  extends Omit<ComponentPropsWithRef<"aside">, "title"> {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function InspectorRail({
  title,
  meta,
  actions,
  className,
  children,
  ...rest
}: InspectorRailProps): ReactElement {
  return (
    <aside {...rest} className={cx("an-inspector-rail", className)}>
      <div className="an-inspector-rail-head">
        <div>
          <div className="an-inspector-rail-title">{title}</div>
          {meta !== undefined ? <div className="an-inspector-rail-meta">{meta}</div> : null}
        </div>
        {actions !== undefined ? <div className="an-inspector-rail-actions">{actions}</div> : null}
      </div>
      <div className="an-inspector-rail-body">{children}</div>
    </aside>
  );
}

export interface InspectorSectionProps
  extends Omit<ComponentPropsWithRef<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function InspectorSection({
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: InspectorSectionProps): ReactElement {
  return (
    <section {...rest} className={cx("an-inspector-section", className)}>
      <div className="an-inspector-section-head">
        <div>
          <div className="an-inspector-section-title">{title}</div>
          {description !== undefined ? (
            <div className="an-inspector-section-description">{description}</div>
          ) : null}
        </div>
        {actions !== undefined ? <div className="an-inspector-section-actions">{actions}</div> : null}
      </div>
      <div className="an-inspector-section-body">{children}</div>
    </section>
  );
}

export interface PropertyRowProps extends ComponentPropsWithRef<"div"> {
  label: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
}

export function PropertyRow({
  label,
  description,
  control,
  className,
  children,
  ...rest
}: PropertyRowProps): ReactElement {
  return (
    <div {...rest} className={cx("an-property-row", className)}>
      <div className="an-property-row-copy">
        <div className="an-property-row-label">{label}</div>
        {description !== undefined ? (
          <div className="an-property-row-description">{description}</div>
        ) : null}
      </div>
      <div className="an-property-row-control">{control ?? children}</div>
    </div>
  );
}

export interface LibraryDrawerProps
  extends Omit<ComponentPropsWithRef<"section">, "title"> {
  title: ReactNode;
  open?: boolean;
  subtitle?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
}

export function LibraryDrawer({
  title,
  open = true,
  subtitle,
  search,
  actions,
  className,
  children,
  ...rest
}: LibraryDrawerProps): ReactElement {
  return (
    <section
      {...rest}
      className={cx("an-library-drawer", className)}
      data-open={open ? "" : undefined}
    >
      <div className="an-library-drawer-head">
        <div>
          <div className="an-library-drawer-title">{title}</div>
          {subtitle !== undefined ? <div className="an-library-drawer-subtitle">{subtitle}</div> : null}
        </div>
        {actions !== undefined ? <div className="an-library-drawer-actions">{actions}</div> : null}
      </div>
      {search !== undefined ? <div className="an-library-drawer-search">{search}</div> : null}
      <div className="an-library-drawer-body">{children}</div>
    </section>
  );
}

export interface LibraryCardProps
  extends Omit<ComponentPropsWithRef<"article">, "title"> {
  title: ReactNode;
  meta?: ReactNode;
  preview?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
}

export function LibraryCard({
  title,
  meta,
  preview,
  actions,
  selected = false,
  className,
  children,
  ...rest
}: LibraryCardProps): ReactElement {
  return (
    <article
      {...rest}
      className={cx("an-library-card", className)}
      data-selected={selected ? "" : undefined}
    >
      {preview !== undefined ? <div className="an-library-card-preview">{preview}</div> : null}
      <div className="an-library-card-main">
        <div className="an-library-card-title">{title}</div>
        {meta !== undefined ? <div className="an-library-card-meta">{meta}</div> : null}
        {children !== undefined ? <div className="an-library-card-body">{children}</div> : null}
      </div>
      {actions !== undefined ? <div className="an-library-card-actions">{actions}</div> : null}
    </article>
  );
}

export interface AssetTileProps
  extends Omit<ComponentPropsWithRef<"article">, "title"> {
  title: ReactNode;
  meta?: ReactNode;
  preview?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
}

export function AssetTile({
  title,
  meta,
  preview,
  actions,
  selected = false,
  className,
  children,
  ...rest
}: AssetTileProps): ReactElement {
  return (
    <article
      {...rest}
      className={cx("an-asset-tile", className)}
      data-selected={selected ? "" : undefined}
    >
      <div className="an-asset-tile-preview">{preview}</div>
      <div className="an-asset-tile-copy">
        <div className="an-asset-tile-title">{title}</div>
        {meta !== undefined ? <div className="an-asset-tile-meta">{meta}</div> : null}
        {children !== undefined ? <div className="an-asset-tile-body">{children}</div> : null}
      </div>
      {actions !== undefined ? <div className="an-asset-tile-actions">{actions}</div> : null}
    </article>
  );
}

export interface DropzoneProps
  extends Omit<ComponentPropsWithRef<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  actions?: ReactNode;
}

export function Dropzone({
  title,
  description,
  icon,
  active = false,
  disabled = false,
  actions,
  className,
  children,
  ...rest
}: DropzoneProps): ReactElement {
  return (
    <div
      {...rest}
      className={cx("an-dropzone", className)}
      data-active={active ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
    >
      {icon !== undefined ? <div className="an-dropzone-icon">{icon}</div> : null}
      <div className="an-dropzone-copy">
        <div className="an-dropzone-title">{title}</div>
        {description !== undefined ? <div className="an-dropzone-description">{description}</div> : null}
        {children !== undefined ? <div className="an-dropzone-body">{children}</div> : null}
      </div>
      {actions !== undefined ? <div className="an-dropzone-actions">{actions}</div> : null}
    </div>
  );
}

export interface UploadProgressRowProps extends ComponentPropsWithRef<"div"> {
  filename: ReactNode;
  progress?: number;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}

export function UploadProgressRow({
  filename,
  progress,
  meta,
  status,
  actions,
  className,
  ...rest
}: UploadProgressRowProps): ReactElement {
  return (
    <div {...rest} className={cx("an-upload-row", className)}>
      <div className="an-upload-row-copy">
        <div className="an-upload-row-title">{filename}</div>
        {meta !== undefined ? <div className="an-upload-row-meta">{meta}</div> : null}
      </div>
      <ProgressBar
        {...(progress !== undefined ? { value: progress } : {})}
        label="Upload progress"
        accent
      />
      {status !== undefined ? <div className="an-upload-row-status">{status}</div> : null}
      {actions !== undefined ? <div className="an-upload-row-actions">{actions}</div> : null}
    </div>
  );
}

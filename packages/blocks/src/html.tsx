import type { ReactElement } from "react";

/**
 * Renders a sanitized HTML fragment. Fragments are validated by
 * @forge/schema's sanitizer policy before they ever reach a renderer
 * (htmlFragmentSchema), so dangerouslySetInnerHTML is safe here by contract.
 * Never pass unvalidated strings to this component.
 */
export function Html({
  fragment,
  className,
}: {
  fragment: string;
  className?: string;
}): ReactElement {
  return (
    <div
      className={className ? `fb-html ${className}` : "fb-html"}
      dangerouslySetInnerHTML={{ __html: fragment }}
    />
  );
}

export function MediaPlaceholder({ label }: { label: string }): ReactElement {
  return (
    <div className="fb-media-placeholder" role="img" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

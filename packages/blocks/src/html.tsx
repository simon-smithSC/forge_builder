import type { ReactElement } from "react";
import { useRenderContext } from "./context.js";

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

/**
 * An html fragment that is editable in place on the editor canvas (Rise
 * parity P1). In mode "edit" with the inlineEditing port present it
 * delegates rendering to the host-supplied editor component; in every other
 * case (player, edit without port) it renders <Html> exactly as before, so
 * player output is byte-identical. `path` is the JSON path of the field
 * inside the block payload (e.g. "html", "heading", "items.2.html").
 */
export function EditableHtml({
  blockId,
  path,
  fragment,
  className,
}: {
  blockId: string;
  path: string;
  fragment: string;
  className?: string;
}): ReactElement {
  const { mode, inlineEditing } = useRenderContext();
  if (mode === "edit" && inlineEditing) {
    return (
      <>
        {inlineEditing.renderHtmlEditor({
          blockId,
          path,
          html: fragment,
          ...(className !== undefined ? { className } : {}),
        })}
      </>
    );
  }
  return (
    <Html fragment={fragment} {...(className !== undefined ? { className } : {})} />
  );
}

export function MediaPlaceholder({ label }: { label: string }): ReactElement {
  return (
    <div className="fb-media-placeholder" role="img" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

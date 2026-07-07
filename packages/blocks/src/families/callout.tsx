import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { EditableHtml } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type CalloutBlock =
  | BlockFor<"callout", "info">
  | BlockFor<"callout", "warning">
  | BlockFor<"callout", "success">
  | BlockFor<"callout", "danger">;

const DEFAULT_GLYPHS: Record<string, string> = {
  info: "ℹ",
  warning: "⚠",
  success: "✓",
  danger: "!",
};

function CalloutRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as CalloutBlock;
  const glyph = b.payload.icon ?? DEFAULT_GLYPHS[b.variant] ?? "ℹ";
  return (
    <aside className={`fb-callout fb-callout-${b.variant}`} role="note">
      <span className="fb-callout-icon" aria-hidden="true">
        {glyph}
      </span>
      <div className="fb-callout-content">
        {b.payload.title ? (
          <h4 className="fb-callout-title">{b.payload.title}</h4>
        ) : null}
        <EditableHtml blockId={b.id} path="html" fragment={b.payload.html} />
      </div>
    </aside>
  );
}

export const calloutEntry: BlockRegistryEntry = {
  family: "callout",
  variants: variantsOf("callout"),
  palette: {
    label: "Callout",
    group: "text",
    description: "Info, warning, success, and danger notes.",
    icon: "alert-circle",
  },
  createDefaultPayload: () => ({
    html: "<p>Something worth calling out.</p>",
  }),
  validatePayload: (payload, variant) => validateWithSchema("callout", variant, payload),
  Renderer: CalloutRendererImpl,
};

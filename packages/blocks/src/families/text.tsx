import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { EditableHtml } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type TextBlock =
  | BlockFor<"text", "paragraph">
  | BlockFor<"text", "heading">
  | BlockFor<"text", "subheading">
  | BlockFor<"text", "heading+paragraph">
  | BlockFor<"text", "subheading+paragraph">
  | BlockFor<"text", "two column">;

/**
 * Slim audio strip above the text when the optional audioMediaId (schema
 * 1.1.0, Rise "Add audio" on text blocks) resolves to a playable URL.
 */
function TextAudioStrip({
  mediaId,
}: {
  mediaId: string | undefined;
}): ReactElement | null {
  const { resolveMediaUrl } = useRenderContext();
  if (!mediaId) return null;
  const url = resolveMediaUrl(mediaId);
  if (!url) return null;
  return (
    <div className="fb-text-audio">
      <audio controls src={url} className="fb-text-audio-player" preload="metadata" />
    </div>
  );
}

function TextBody({ block }: { block: TextBlock }): ReactElement {
  const id = block.id;
  switch (block.variant) {
    case "paragraph":
      return (
        <EditableHtml
          blockId={id}
          path="html"
          fragment={block.payload.html}
          className="fb-text-paragraph"
        />
      );
    case "heading":
      return (
        <EditableHtml
          blockId={id}
          path="heading"
          fragment={block.payload.heading}
          className="fb-text-heading"
        />
      );
    case "subheading":
      return (
        <EditableHtml
          blockId={id}
          path="subheading"
          fragment={block.payload.subheading}
          className="fb-text-subheading"
        />
      );
    case "heading+paragraph":
      return (
        <div className="fb-text-group">
          <EditableHtml
            blockId={id}
            path="heading"
            fragment={block.payload.heading}
            className="fb-text-heading"
          />
          <EditableHtml
            blockId={id}
            path="html"
            fragment={block.payload.html}
            className="fb-text-paragraph"
          />
        </div>
      );
    case "subheading+paragraph":
      return (
        <div className="fb-text-group">
          <EditableHtml
            blockId={id}
            path="subheading"
            fragment={block.payload.subheading}
            className="fb-text-subheading"
          />
          <EditableHtml
            blockId={id}
            path="html"
            fragment={block.payload.html}
            className="fb-text-paragraph"
          />
        </div>
      );
    case "two column":
      return (
        <div className="fb-text-two-column">
          {block.payload.columns.map((column, index) => (
            <EditableHtml
              key={column.id}
              blockId={id}
              path={`columns.${index}.html`}
              fragment={column.html}
              className="fb-text-paragraph"
            />
          ))}
        </div>
      );
  }
}

function TextRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as TextBlock;
  return (
    <div className="fb-text">
      <TextAudioStrip mediaId={b.payload.audioMediaId} />
      <TextBody block={b} />
    </div>
  );
}

const defaults: Record<string, () => unknown> = {
  paragraph: () => ({ html: "<p>Write a clear, focused paragraph.</p>" }),
  heading: () => ({ heading: "<h2>Heading</h2>" }),
  subheading: () => ({ subheading: "<h3>Subheading</h3>" }),
  "heading+paragraph": () => ({
    heading: "<h2>Heading</h2>",
    html: "<p>Write a clear, focused paragraph.</p>",
  }),
  "subheading+paragraph": () => ({
    subheading: "<h3>Subheading</h3>",
    html: "<p>Write a clear, focused paragraph.</p>",
  }),
  "two column": () => ({
    columns: [
      { id: "col-1", html: "<p>Left column copy.</p>" },
      { id: "col-2", html: "<p>Right column copy.</p>" },
    ],
  }),
};

export const textEntry: BlockRegistryEntry = {
  family: "text",
  variants: variantsOf("text"),
  palette: {
    label: "Text",
    group: "text",
    description: "Paragraphs, headings, and multi-column copy.",
    icon: "type",
  },
  createDefaultPayload: (variant) => {
    const factory = defaults[variant];
    if (!factory) throw new Error(`Unknown text variant "${variant}".`);
    return factory();
  },
  validatePayload: (payload, variant) => validateWithSchema("text", variant, payload),
  Renderer: TextRendererImpl,
};

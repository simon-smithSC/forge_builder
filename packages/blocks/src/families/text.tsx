import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { Html } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type TextBlock =
  | BlockFor<"text", "paragraph">
  | BlockFor<"text", "heading">
  | BlockFor<"text", "subheading">
  | BlockFor<"text", "heading+paragraph">
  | BlockFor<"text", "subheading+paragraph">
  | BlockFor<"text", "two column">;

function TextRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as TextBlock;
  switch (b.variant) {
    case "paragraph":
      return <Html fragment={b.payload.html} className="fb-text-paragraph" />;
    case "heading":
      return <Html fragment={b.payload.heading} className="fb-text-heading" />;
    case "subheading":
      return (
        <Html fragment={b.payload.subheading} className="fb-text-subheading" />
      );
    case "heading+paragraph":
      return (
        <div className="fb-text">
          <Html fragment={b.payload.heading} className="fb-text-heading" />
          <Html fragment={b.payload.html} className="fb-text-paragraph" />
        </div>
      );
    case "subheading+paragraph":
      return (
        <div className="fb-text">
          <Html fragment={b.payload.subheading} className="fb-text-subheading" />
          <Html fragment={b.payload.html} className="fb-text-paragraph" />
        </div>
      );
    case "two column":
      return (
        <div className="fb-text-two-column">
          {b.payload.columns.map((column) => (
            <Html key={column.id} fragment={column.html} className="fb-text-paragraph" />
          ))}
        </div>
      );
  }
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

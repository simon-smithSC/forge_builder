import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { Html } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ImpactBlock =
  | BlockFor<"impact", "a">
  | BlockFor<"impact", "b">
  | BlockFor<"impact", "c">
  | BlockFor<"impact", "d">
  | BlockFor<"impact", "note">;

/**
 * Impact statements: variants a-d are progressively different framings of a
 * pull-quote (size, border, tone); "note" is a subtle note card.
 */
function ImpactRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ImpactBlock;
  if (b.variant === "note") {
    return (
      <aside className="fb-impact fb-impact-note" role="note">
        <Html fragment={b.payload.html} className="fb-impact-note-body" />
        {b.payload.attribution ? (
          <p className="fb-impact-attribution">{b.payload.attribution}</p>
        ) : null}
      </aside>
    );
  }
  return (
    <figure className={`fb-impact fb-impact-${b.variant}`}>
      <blockquote className="fb-impact-quote">
        <Html fragment={b.payload.html} />
      </blockquote>
      {b.payload.attribution ? (
        <figcaption className="fb-impact-attribution">
          {b.payload.attribution}
        </figcaption>
      ) : null}
    </figure>
  );
}

export const impactEntry: BlockRegistryEntry = {
  family: "impact",
  variants: variantsOf("impact"),
  palette: {
    label: "Statement",
    group: "text",
    description: "Pull-quotes and note cards that make a point land.",
    icon: "quote",
  },
  createDefaultPayload: () => ({
    html: "<p>A statement worth pausing on.</p>",
  }),
  validatePayload: (payload, variant) => validateWithSchema("impact", variant, payload),
  Renderer: ImpactRendererImpl,
};

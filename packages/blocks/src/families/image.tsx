import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ImageBlock =
  | BlockFor<"image", "hero">
  | BlockFor<"image", "full width">
  | BlockFor<"image", "centered">
  | BlockFor<"image", "text aside">
  | BlockFor<"image", "banner">;

function ImageRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ImageBlock;
  const { resolveMediaUrl, events, mode } = useRenderContext();
  const [zoomed, setZoomed] = useState(false);
  const url = resolveMediaUrl(b.payload.mediaId);
  const variantClass = `fb-image fb-image-${b.variant.replace(/\s+/g, "-")}`;

  const figure = (
    <figure className={variantClass}>
      {url ? (
        <img
          src={url}
          alt={b.payload.alt}
          className={b.payload.zoomOnClick ? "fb-image-zoomable" : undefined}
          onClick={
            b.payload.zoomOnClick
              ? () => {
                  setZoomed(true);
                  if (mode === "player") events.onInteracted?.(b.id, { zoomed: true });
                }
              : undefined
          }
        />
      ) : (
        <MediaPlaceholder label={b.payload.alt} />
      )}
      {b.payload.caption ? (
        <figcaption className="fb-image-caption">{b.payload.caption}</figcaption>
      ) : null}
      {zoomed && url ? (
        <div
          className="fb-lightbox"
          role="dialog"
          aria-label={b.payload.alt}
          onClick={() => setZoomed(false)}
        >
          <img src={url} alt={b.payload.alt} />
        </div>
      ) : null}
    </figure>
  );

  if (b.variant === "text aside" && b.payload.text) {
    return (
      <div className="fb-image-text-aside">
        {figure}
        <Html fragment={b.payload.text} className="fb-image-aside-text" />
      </div>
    );
  }
  return figure;
}

export const imageEntry: BlockRegistryEntry = {
  family: "image",
  variants: variantsOf("image"),
  palette: {
    label: "Image",
    group: "media",
    description: "Hero, full width, centered, text aside, and banner images.",
    icon: "image",
  },
  createDefaultPayload: () => ({
    mediaId: "media-placeholder",
    alt: "Describe this image",
    zoomOnClick: false,
  }),
  validatePayload: (payload, variant) => validateWithSchema("image", variant, payload),
  Renderer: ImageRendererImpl,
};

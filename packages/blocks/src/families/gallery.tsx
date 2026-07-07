import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type GalleryBlock =
  | BlockFor<"gallery", "carousel (centered)">
  | BlockFor<"gallery", "two column grid">
  | BlockFor<"gallery", "three column grid">
  | BlockFor<"gallery", "four column grid">;

type GalleryItem = GalleryBlock["payload"]["items"][number];

function GalleryFigure({ item }: { item: GalleryItem }): ReactElement {
  const { resolveMediaUrl } = useRenderContext();
  const url = resolveMediaUrl(item.mediaId);
  return (
    <figure className="fb-gallery-figure">
      {url ? <img src={url} alt={item.alt} /> : <MediaPlaceholder label={item.alt} />}
      {item.caption ? (
        <figcaption className="fb-gallery-caption">{item.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function GalleryRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as GalleryBlock;
  const { mode, events } = useRenderContext();
  const [index, setIndex] = useState(0);
  const items = b.payload.items;

  if (b.variant === "carousel (centered)") {
    const safeIndex = Math.min(index, items.length - 1);
    const current = items[safeIndex];
    const go = (next: number) => {
      const wrapped = (next + items.length) % items.length;
      setIndex(wrapped);
      if (mode === "player") {
        events.onInteracted?.(b.id, { index: wrapped });
      }
    };
    // Rise carousel chrome: arrows at the image edges, "1 of 2" counter,
    // position dots, caption below the slide (teardown Gallery, 534-560).
    return (
      <div className="fb-gallery fb-gallery-carousel" role="group" aria-roledescription="carousel">
        <div className="fb-gallery-carousel-stage">
          <button
            type="button"
            className="fb-gallery-carousel-arrow fb-gallery-carousel-arrow-prev"
            aria-label="Previous image"
            disabled={items.length < 2}
            onClick={() => go(safeIndex - 1)}
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          {current ? <GalleryFigure item={current} /> : null}
          <button
            type="button"
            className="fb-gallery-carousel-arrow fb-gallery-carousel-arrow-next"
            aria-label="Next image"
            disabled={items.length < 2}
            onClick={() => go(safeIndex + 1)}
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>
        <div className="fb-gallery-carousel-footer">
          <span className="fb-gallery-carousel-counter" aria-live="polite">
            {safeIndex + 1} of {items.length}
          </span>
          <div className="fb-gallery-carousel-dots">
            {items.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                className={`fb-gallery-carousel-dot${
                  dotIndex === safeIndex ? " fb-gallery-carousel-dot-active" : ""
                }`}
                aria-label={`Go to image ${dotIndex + 1} of ${items.length}`}
                aria-current={dotIndex === safeIndex}
                onClick={() => go(dotIndex)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const columns =
    b.variant === "two column grid" ? 2 : b.variant === "three column grid" ? 3 : 4;
  return (
    <div className={`fb-gallery fb-gallery-grid fb-gallery-grid-${columns}`}>
      {items.map((item) => (
        <GalleryFigure key={item.id} item={item} />
      ))}
    </div>
  );
}

export const galleryEntry: BlockRegistryEntry = {
  family: "gallery",
  variants: variantsOf("gallery"),
  palette: {
    label: "Gallery",
    group: "media",
    description: "Image grids and a centered carousel.",
    icon: "layout-grid",
  },
  contentWidth: "wide",
  createDefaultPayload: () => ({
    items: [
      { id: "item-1", mediaId: "media-placeholder", alt: "First image" },
      { id: "item-2", mediaId: "media-placeholder", alt: "Second image" },
    ],
  }),
  validatePayload: (payload, variant) => validateWithSchema("gallery", variant, payload),
  Renderer: GalleryRendererImpl,
};

import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type AudioBlock = BlockFor<"audio", "standalone audio">;

function AudioRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as AudioBlock;
  const { resolveMediaUrl } = useRenderContext();
  const url = resolveMediaUrl(b.payload.mediaId);
  return (
    <div className="fb-audio">
      {b.payload.title ? <h3 className="fb-audio-title">{b.payload.title}</h3> : null}
      {url ? (
        <audio controls src={url} className="fb-audio-player" />
      ) : (
        <MediaPlaceholder label={b.payload.title ?? "Audio"} />
      )}
      <details className="fb-audio-transcript">
        <summary>Transcript</summary>
        <Html fragment={b.payload.transcript} />
      </details>
    </div>
  );
}

export const audioEntry: BlockRegistryEntry = {
  family: "audio",
  variants: variantsOf("audio"),
  palette: {
    label: "Audio",
    group: "media",
    description: "Standalone audio with a transcript.",
    icon: "volume-2",
  },
  createDefaultPayload: () => ({
    mediaId: "media-placeholder",
    transcript: "<p>Transcript goes here.</p>",
  }),
  validatePayload: (payload, variant) => validateWithSchema("audio", variant, payload),
  Renderer: AudioRendererImpl,
};

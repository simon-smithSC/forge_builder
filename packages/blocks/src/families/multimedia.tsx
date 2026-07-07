import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type VideoBlock = BlockFor<"multimedia", "video">;
type EmbedBlock = BlockFor<"multimedia", "embed">;
type AttachmentBlock = BlockFor<"multimedia", "attachment">;
type CodeBlock = BlockFor<"multimedia", "code">;
type MultimediaBlock = VideoBlock | EmbedBlock | AttachmentBlock | CodeBlock;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  const unit = units[unitIndex] ?? "TB";
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

function VideoView({ block }: { block: VideoBlock }): ReactElement {
  const { resolveMediaUrl } = useRenderContext();
  const url = resolveMediaUrl(block.payload.mediaId);
  const poster = block.payload.posterMediaId
    ? resolveMediaUrl(block.payload.posterMediaId)
    : undefined;
  return (
    <div className="fb-multimedia fb-multimedia-video">
      {url ? (
        <video controls className="fb-multimedia-video-player" poster={poster}>
          <source src={url} />
          {block.payload.captions.map((caption) => {
            const trackUrl = resolveMediaUrl(caption.mediaId);
            if (!trackUrl) return null;
            return (
              <track
                key={caption.id}
                kind="captions"
                src={trackUrl}
                srcLang={caption.srclang}
                label={caption.label}
                default={caption.default ?? false}
              />
            );
          })}
        </video>
      ) : (
        <MediaPlaceholder label="Video" />
      )}
      {block.payload.transcript ? (
        <details className="fb-multimedia-transcript">
          <summary>Transcript</summary>
          <Html fragment={block.payload.transcript} />
        </details>
      ) : null}
    </div>
  );
}

function EmbedView({ block }: { block: EmbedBlock }): ReactElement {
  const ratio = block.payload.aspectRatio.replace(":", " / ");
  return (
    <div className="fb-multimedia fb-multimedia-embed" style={{ aspectRatio: ratio }}>
      <iframe
        className="fb-multimedia-embed-frame"
        src={block.payload.url}
        title={block.payload.title}
        allowFullScreen={block.payload.allowFullscreen}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

function AttachmentView({ block }: { block: AttachmentBlock }): ReactElement {
  const { resolveMediaUrl } = useRenderContext();
  const url = resolveMediaUrl(block.payload.mediaId);
  const body = (
    <>
      <span className="fb-multimedia-attachment-icon" aria-hidden="true">
        &#8595;
      </span>
      <span className="fb-multimedia-attachment-meta">
        <span className="fb-multimedia-attachment-label">{block.payload.label}</span>
        <span className="fb-multimedia-attachment-size">
          {url ? formatBytes(block.payload.sizeBytes) : "No file added"}
        </span>
      </span>
    </>
  );
  if (!url) {
    return <div className="fb-multimedia fb-multimedia-attachment">{body}</div>;
  }
  return (
    <a className="fb-multimedia fb-multimedia-attachment" href={url} download>
      {body}
    </a>
  );
}

function CodeView({ block }: { block: CodeBlock }): ReactElement {
  const [copied, setCopied] = useState(false);
  const { code, language, showLineNumbers, copyButton } = block.payload;
  const lines = code.split("\n");
  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => undefined);
    }
  };
  return (
    <div className="fb-multimedia fb-multimedia-code">
      <div className="fb-multimedia-code-header">
        <span className="fb-multimedia-code-language">{language}</span>
        {copyButton ? (
          <button type="button" className="fb-multimedia-code-copy" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>
      <pre className={`fb-multimedia-code-pre language-${language}`}>
        <code className={`language-${language}`}>
          {showLineNumbers
            ? lines.map((line, lineIndex) => (
                <span key={lineIndex} className="fb-multimedia-code-line">
                  <span className="fb-multimedia-code-lineno" aria-hidden="true">
                    {lineIndex + 1}
                  </span>
                  {line}
                  {"\n"}
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}

function MultimediaRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as MultimediaBlock;
  switch (b.variant) {
    case "video":
      return <VideoView block={b} />;
    case "embed":
      return <EmbedView block={b} />;
    case "attachment":
      return <AttachmentView block={b} />;
    case "code":
      return <CodeView block={b} />;
  }
}

const defaults: Record<string, () => unknown> = {
  video: () => ({ mediaId: "media-placeholder", captions: [] }),
  embed: () => ({
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    title: "Embedded video",
    allowFullscreen: true,
    aspectRatio: "16:9",
  }),
  attachment: () => ({
    mediaId: "media-placeholder",
    label: "Download attachment",
    sizeBytes: 0,
  }),
  code: () => ({
    language: "javascript",
    code: 'console.log("Hello, Forge");',
    showLineNumbers: true,
    copyButton: true,
  }),
};

export const multimediaEntry: BlockRegistryEntry = {
  family: "multimedia",
  variants: variantsOf("multimedia"),
  palette: {
    label: "Multimedia",
    group: "media",
    description: "Video, embeds, attachments, and code snippets.",
    icon: "clapperboard",
  },
  createDefaultPayload: (variant) => {
    const factory = defaults[variant];
    if (!factory) throw new Error(`Unknown multimedia variant "${variant}".`);
    return factory();
  },
  validatePayload: (payload, variant) =>
    validateWithSchema("multimedia", variant, payload),
  Renderer: MultimediaRendererImpl,
};

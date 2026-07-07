// Purpose-built editors for the multimedia family: video, embed, attachment,
// and code variants.
import type { ReactElement } from "react";
import type { Block } from "@forge/schema";
import { createUlid, embedAllowlist } from "@forge/schema";
import {
  HtmlField,
  ItemListEditor,
  NumberField,
  SelectField,
  StringField,
  TextAreaField,
  ToggleField,
} from "./fields.js";
import { MediaAddButton, MediaPickerField, useMediaMap } from "./mediaField.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

type VideoPayload = Extract<Block, { family: "multimedia"; variant: "video" }>["payload"];
type EmbedPayload = Extract<Block, { family: "multimedia"; variant: "embed" }>["payload"];
type AttachmentPayload = Extract<
  Block,
  { family: "multimedia"; variant: "attachment" }
>["payload"];
type CodePayload = Extract<Block, { family: "multimedia"; variant: "code" }>["payload"];

type Commit = (payload: unknown) => void;

function VideoEditor({
  payload,
  onChange,
}: {
  payload: VideoPayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <MediaPickerField
        label="Video"
        kind="video"
        mediaId={payload.mediaId}
        required
        onSelect={(mediaId) => onChange({ ...payload, mediaId })}
      />
      <MediaPickerField
        label="Poster image"
        kind="image"
        mediaId={payload.posterMediaId}
        onSelect={(posterMediaId) => onChange({ ...payload, posterMediaId })}
        onClear={() => onChange(setOptional(payload, "posterMediaId", undefined))}
      />
      <HtmlField
        label="Transcript (HTML)"
        value={payload.transcript ?? ""}
        rows={5}
        onCommit={(raw) => onChange(setOptional(payload, "transcript", raw))}
      />
      <ItemListEditor
        label="Caption tracks"
        itemLabel="Caption track"
        items={payload.captions}
        onCommit={(captions) => onChange({ ...payload, captions })}
        renderItem={(track, update) => (
          <>
            <MediaPickerField
              label="Captions file"
              kind="captions"
              mediaId={track.mediaId}
              required
              onSelect={(mediaId) => update({ ...track, mediaId })}
            />
            <StringField
              label="Language code"
              value={track.srclang}
              required
              hint="e.g. en, fi, sv-SE"
              onCommit={(raw) => update({ ...track, srclang: raw })}
            />
            <StringField
              label="Label"
              value={track.label}
              required
              hint="Shown in the captions menu, e.g. English."
              onCommit={(raw) => update({ ...track, label: raw })}
            />
            <ToggleField
              label="Default track"
              checked={track.default ?? false}
              onCommit={(checked) => update({ ...track, default: checked })}
            />
          </>
        )}
        extraAdd={(append) => (
          <MediaAddButton
            label="Add caption track..."
            kind="captions"
            onSelect={(mediaId) =>
              append({ id: createUlid(), mediaId, srclang: "en", label: "English" })
            }
          />
        )}
      />
    </>
  );
}

function EmbedEditor({
  payload,
  onChange,
}: {
  payload: EmbedPayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <StringField
        label="Embed URL"
        value={payload.url}
        required
        hint={`Allowed prefixes: ${embedAllowlist.join("  |  ")}`}
        onCommit={(raw) => onChange({ ...payload, url: raw })}
      />
      <StringField
        label="Title"
        value={payload.title}
        required
        hint="Accessible title for the embedded frame."
        onCommit={(raw) => onChange({ ...payload, title: raw })}
      />
      <SelectField
        label="Aspect ratio"
        value={payload.aspectRatio}
        options={[
          { value: "16:9", label: "16:9 (widescreen)" },
          { value: "4:3", label: "4:3" },
          { value: "1:1", label: "1:1 (square)" },
        ]}
        onCommit={(aspectRatio) => onChange({ ...payload, aspectRatio })}
      />
      <ToggleField
        label="Allow fullscreen"
        checked={payload.allowFullscreen}
        onCommit={(allowFullscreen) => onChange({ ...payload, allowFullscreen })}
      />
    </>
  );
}

function AttachmentEditor({
  payload,
  onChange,
}: {
  payload: AttachmentPayload;
  onChange: Commit;
}): ReactElement {
  const media = useMediaMap();
  return (
    <>
      <MediaPickerField
        label="File"
        kind="attachment"
        mediaId={payload.mediaId}
        required
        onSelect={(mediaId) => {
          const bytes = media[mediaId]?.bytes;
          onChange({ ...payload, mediaId, sizeBytes: bytes ?? payload.sizeBytes });
        }}
      />
      <StringField
        label="Label"
        value={payload.label}
        required
        onCommit={(raw) => onChange({ ...payload, label: raw })}
      />
      <NumberField
        label="Size (bytes)"
        value={payload.sizeBytes}
        min={0}
        step={1}
        hint="Auto-filled from the selected media."
        onCommit={(sizeBytes) => onChange({ ...payload, sizeBytes })}
      />
    </>
  );
}

function CodeEditor({
  payload,
  onChange,
}: {
  payload: CodePayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <StringField
        label="Language"
        value={payload.language}
        required
        hint="e.g. typescript, python, sql"
        onCommit={(raw) => onChange({ ...payload, language: raw })}
      />
      <TextAreaField
        label="Code"
        value={payload.code}
        required
        rows={10}
        mono
        onCommit={(raw) => onChange({ ...payload, code: raw })}
      />
      <ToggleField
        label="Show line numbers"
        checked={payload.showLineNumbers}
        onCommit={(showLineNumbers) => onChange({ ...payload, showLineNumbers })}
      />
      <ToggleField
        label="Show copy button"
        checked={payload.copyButton}
        onCommit={(copyButton) => onChange({ ...payload, copyButton })}
      />
    </>
  );
}

export function MultimediaEditor({
  block,
  onChange,
}: FamilyEditorProps): ReactElement | null {
  if (block.family !== "multimedia") return null;
  switch (block.variant) {
    case "video":
      return <VideoEditor payload={block.payload} onChange={onChange} />;
    case "embed":
      return <EmbedEditor payload={block.payload} onChange={onChange} />;
    case "attachment":
      return <AttachmentEditor payload={block.payload} onChange={onChange} />;
    case "code":
      return <CodeEditor payload={block.payload} onChange={onChange} />;
    default:
      return null;
  }
}

// Purpose-built editors for the media families: image, gallery, and audio.
import type { ReactElement } from "react";
import { createUlid } from "@forge/schema";
import { HtmlField, ItemListEditor, StringField, ToggleField } from "./fields.js";
import { MediaAddButton, MediaPickerField } from "./mediaField.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

export function ImageEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "image") return null;
  const payload = block.payload;

  return (
    <>
      <MediaPickerField
        label="Image"
        kind="image"
        mediaId={payload.mediaId}
        required
        onSelect={(mediaId) => onChange({ ...payload, mediaId })}
      />
      <StringField
        label="Alt text"
        value={payload.alt}
        required
        hint="Describes the image for screen readers."
        onCommit={(raw) => onChange({ ...payload, alt: raw })}
      />
      <StringField
        label="Caption"
        value={payload.caption ?? ""}
        placeholder="Optional caption"
        onCommit={(raw) => onChange(setOptional(payload, "caption", raw))}
      />
      <ToggleField
        label="Zoom on click"
        checked={payload.zoomOnClick}
        onCommit={(zoomOnClick) => onChange({ ...payload, zoomOnClick })}
      />
      {block.variant === "text aside" ? (
        <HtmlField
          label="Aside text (HTML)"
          value={payload.text ?? ""}
          rows={4}
          onCommit={(raw) => onChange(setOptional(payload, "text", raw))}
        />
      ) : null}
    </>
  );
}

export function GalleryEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "gallery") return null;
  const payload = block.payload;

  return (
    <ItemListEditor
      label="Gallery images"
      itemLabel="Image"
      items={payload.items}
      minItems={1}
      onCommit={(items) => onChange({ items })}
      renderItem={(item, update) => (
        <>
          <MediaPickerField
            label="Image"
            kind="image"
            mediaId={item.mediaId}
            required
            onSelect={(mediaId) => update({ ...item, mediaId })}
          />
          <StringField
            label="Alt text"
            value={item.alt}
            required
            onCommit={(raw) => update({ ...item, alt: raw })}
          />
          <StringField
            label="Caption"
            value={item.caption ?? ""}
            placeholder="Optional caption"
            onCommit={(raw) => update(setOptional(item, "caption", raw))}
          />
        </>
      )}
      extraAdd={(append) => (
        <MediaAddButton
          label="Add image..."
          kind="image"
          onSelect={(mediaId) => append({ id: createUlid(), mediaId, alt: "Image" })}
        />
      )}
    />
  );
}

export function AudioEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "audio") return null;
  const payload = block.payload;

  return (
    <>
      <MediaPickerField
        label="Audio file"
        kind="audio"
        mediaId={payload.mediaId}
        required
        onSelect={(mediaId) => onChange({ ...payload, mediaId })}
      />
      <StringField
        label="Title"
        value={payload.title ?? ""}
        placeholder="Optional title"
        onCommit={(raw) => onChange(setOptional(payload, "title", raw))}
      />
      <HtmlField
        label="Transcript (HTML)"
        value={payload.transcript}
        required
        rows={5}
        onCommit={(raw) => onChange({ ...payload, transcript: raw })}
      />
    </>
  );
}

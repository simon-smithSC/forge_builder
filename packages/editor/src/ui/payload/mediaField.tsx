// Media reference fields backed by the shared MediaPicker dialog (built in
// parallel at ui/dialogs/MediaPicker.tsx per the R2 media picker contract).
import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "@forge/ui";
import type { MediaRef } from "@forge/schema";
import { MediaPicker } from "../dialogs/MediaPicker.js";
import { useStore } from "../../state/store.js";

export type MediaKind = "image" | "video" | "audio" | "attachment" | "captions";

// Re-exported so sibling editors depend on one MediaPicker import site.
export { MediaPicker } from "../dialogs/MediaPicker.js";

const EMPTY_MEDIA: Record<string, MediaRef> = {};

/** Stable-reference selector over course.media for filename lookups. */
export function useMediaMap(): Record<string, MediaRef> {
  return useStore((state) => state.course?.media ?? EMPTY_MEDIA);
}

export function MediaPickerField({
  label,
  mediaId,
  kind,
  required,
  onSelect,
  onClear,
}: {
  label: string;
  mediaId?: string | undefined;
  kind?: MediaKind | undefined;
  required?: boolean | undefined;
  onSelect: (mediaId: string) => void;
  /** Provide for optional media slots; renders a Clear button. */
  onClear?: (() => void) | undefined;
}): ReactElement {
  const media = useMediaMap();
  const [open, setOpen] = useState(false);
  const current = mediaId ? media[mediaId] : undefined;
  const currentLabel = current
    ? current.filename
    : mediaId
      ? `Unresolved (${mediaId})`
      : "None";

  return (
    <div className="fe-field">
      <span className="fe-field-label">
        {label}
        {required ? <span className="fe-pl-required">Required</span> : null}
      </span>
      <span className="fe-pl-media-row">
        <Button size="sm" onClick={() => setOpen(true)}>
          Choose media...
        </Button>
        <span className="fe-media-current">{currentLabel}</span>
        {onClear && mediaId ? (
          <Button size="sm" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </span>
      {required && !mediaId ? (
        <span className="fe-field-error">{label} is required.</span>
      ) : null}
      <MediaPicker
        open={open}
        {...(kind ? { kind } : {})}
        onClose={() => setOpen(false)}
        onSelect={(id: string) => {
          setOpen(false);
          onSelect(id);
        }}
      />
    </div>
  );
}

/** Button that opens the media picker and reports the chosen media id. */
export function MediaAddButton({
  label,
  kind,
  onSelect,
}: {
  label: string;
  kind?: MediaKind | undefined;
  onSelect: (mediaId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <MediaPicker
        open={open}
        {...(kind ? { kind } : {})}
        onClose={() => setOpen(false)}
        onSelect={(id: string) => {
          setOpen(false);
          onSelect(id);
        }}
      />
    </>
  );
}

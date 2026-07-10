// Tabbed media picker: Library (existing course.media), Upload (object-URL
// bridge), URL (remote reference). Registers media through
// state/courseToolsActions registerMedia, the same path as the R1 bridge.
// R2.5: signed-URL upload to services/api replaces the object-URL bridge.
import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Captions, Image as ImageIcon, Music, Paperclip, UploadCloud, Video } from "lucide-react";
import { AssetTile, Button, Dropzone, Input, TabPanel, Tabs, UploadProgressRow } from "@forge/ui";
import type { MediaRef } from "@forge/schema";
import { collectMediaUses, createUlid } from "@forge/schema";
import { registerMedia } from "../../state/courseToolsActions.js";
import { useStore } from "../../state/store.js";
import { Dialog } from "./Dialog.js";
import "./dialogs.css";

type MediaKind = MediaRef["kind"];

export interface MediaPickerProps {
  open: boolean;
  kind?: "image" | "video" | "audio" | "attachment" | "captions";
  onClose: () => void;
  onSelect: (mediaId: string) => void;
}

const ACCEPT: Record<MediaKind, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  captions: ".vtt,text/vtt",
  attachment: "",
};

const EXT_GUESS: Record<string, { kind: MediaKind; mime: string }> = {
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  png: { kind: "image", mime: "image/png" },
  gif: { kind: "image", mime: "image/gif" },
  webp: { kind: "image", mime: "image/webp" },
  avif: { kind: "image", mime: "image/avif" },
  svg: { kind: "image", mime: "image/svg+xml" },
  mp4: { kind: "video", mime: "video/mp4" },
  webm: { kind: "video", mime: "video/webm" },
  mov: { kind: "video", mime: "video/quicktime" },
  mp3: { kind: "audio", mime: "audio/mpeg" },
  wav: { kind: "audio", mime: "audio/wav" },
  ogg: { kind: "audio", mime: "audio/ogg" },
  m4a: { kind: "audio", mime: "audio/mp4" },
  vtt: { kind: "captions", mime: "text/vtt" },
  pdf: { kind: "attachment", mime: "application/pdf" },
  zip: { kind: "attachment", mime: "application/zip" },
};

function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "text/vtt") return "captions";
  return "attachment";
}

function kindIcon(kind: MediaKind): ReactElement {
  if (kind === "image") return <ImageIcon size={22} aria-hidden />;
  if (kind === "video") return <Video size={22} aria-hidden />;
  if (kind === "audio") return <Music size={22} aria-hidden />;
  if (kind === "captions") return <Captions size={22} aria-hidden />;
  return <Paperclip size={22} aria-hidden />;
}

interface PendingUpload {
  file: File;
  objectUrl: string;
  dims: { width: number; height: number } | null;
}

const TABS = ["library", "upload", "url"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  library: "Library",
  upload: "Upload",
  url: "URL",
};

export function MediaPicker(props: MediaPickerProps): ReactElement | null {
  // Motion M3: stay mounted through the Dialog's exit transition, then drop
  // to null on onExited so each open still starts from fresh state.
  const [exited, setExited] = useState(!props.open);
  if (props.open && exited) setExited(false);
  if (!props.open && exited) return null;
  return (
    <MediaPickerDialog
      open={props.open}
      kind={props.kind}
      onExited={() => setExited(true)}
      onClose={props.onClose}
      onSelect={props.onSelect}
    />
  );
}

function MediaPickerDialog({
  open,
  kind,
  onExited,
  onClose,
  onSelect,
}: {
  open: boolean;
  kind: MediaKind | undefined;
  onExited: () => void;
  onClose: () => void;
  onSelect: (mediaId: string) => void;
}): ReactElement {
  const media = useStore((state) => state.course?.media);
  const course = useStore((state) => state.course);
  const mediaUrls = useStore((state) => state.mediaUrls);
  const [tab, setTab] = useState<Tab>("library");
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [alt, setAlt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const committedRef = useRef(false);
  const pendingRef = useRef<PendingUpload | null>(null);
  pendingRef.current = pending;

  useEffect(
    () => () => {
      if (!committedRef.current && pendingRef.current) {
        URL.revokeObjectURL(pendingRef.current.objectUrl);
      }
    },
    [],
  );

  const finish = (ref: MediaRef, url: string): void => {
    committedRef.current = true;
    registerMedia(ref, url);
    onSelect(ref.id);
    onClose();
  };

  const commitFile = (staged: PendingUpload, altText: string): void => {
    const id = createUlid();
    const fileKind = kind ?? kindFromMime(staged.file.type);
    const ref: MediaRef = {
      id,
      kind: fileKind,
      filename: staged.file.name,
      mime: staged.file.type || "application/octet-stream",
      bytes: staged.file.size,
      storageKey: `local:${id}`,
      ...(staged.dims && staged.dims.width > 0 && staged.dims.height > 0
        ? { width: staged.dims.width, height: staged.dims.height }
        : {}),
      ...(altText.trim().length > 0 ? { alt: altText.trim() } : {}),
    };
    finish(ref, staged.objectUrl);
  };

  const stageFile = (file: File): void => {
    setError(null);
    const fileKind = kind ?? kindFromMime(file.type);
    // Attachments accept any file; other kinds must match the sniffed mime.
    if (
      kind &&
      kind !== "attachment" &&
      file.type !== "" &&
      kindFromMime(file.type) !== kind
    ) {
      setError(`Expected a ${kind} file, got "${file.type}".`);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    if (fileKind !== "image") {
      commitFile({ file, objectUrl, dims: null }, "");
      return;
    }
    setPending({ file, objectUrl, dims: null });
    setAlt("");
    const probe = new window.Image();
    probe.onload = () => {
      setPending((prev) =>
        prev && prev.objectUrl === objectUrl
          ? { ...prev, dims: { width: probe.naturalWidth, height: probe.naturalHeight } }
          : prev,
      );
    };
    probe.src = objectUrl;
  };

  const cancelPending = (): void => {
    if (pending) URL.revokeObjectURL(pending.objectUrl);
    setPending(null);
    setAlt("");
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) stageFile(file);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) stageFile(file);
    event.target.value = "";
  };

  const addFromUrl = (): void => {
    setError(null);
    const trimmed = urlValue.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setError("Enter a valid absolute URL.");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setError("Only http(s) URLs are supported.");
      return;
    }
    const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
    const filename = segments[segments.length - 1] ?? parsed.hostname;
    const ext = filename.includes(".")
      ? (filename.split(".").pop() ?? "").toLowerCase()
      : "";
    const guess = EXT_GUESS[ext];
    const urlKind: MediaKind = kind ?? guess?.kind ?? "attachment";
    const mime =
      guess && guess.kind === urlKind ? guess.mime : "application/octet-stream";
    if (urlKind === "image" && alt.trim().length === 0) {
      setError("Alt text is required for images.");
      return;
    }
    const id = createUlid();
    const ref: MediaRef = {
      id,
      kind: urlKind,
      filename,
      mime,
      bytes: 0,
      storageKey: `url:${trimmed}`,
      ...(urlKind === "image" ? { alt: alt.trim() } : {}),
    };
    finish(ref, trimmed);
  };

  const entries = Object.values(media ?? {}).filter(
    (ref) => !kind || ref.kind === kind,
  );
  const usageCounts = new Map<string, number>();
  if (course) {
    for (const use of collectMediaUses(course)) {
      usageCounts.set(use.mediaId, (usageCounts.get(use.mediaId) ?? 0) + 1);
    }
  }

  return (
    <Dialog
      title={kind ? `Select ${kind}` : "Select media"}
      open={open}
      onExited={onExited}
      onClose={onClose}
    >
      <Tabs
        tabs={TABS.map((item) => ({ id: item, label: TAB_LABEL[item] }))}
        value={tab}
        onValueChange={(id) => {
          setTab(id as Tab);
          setError(null);
        }}
        label="Media source"
        idPrefix="fe-media"
      />

      <TabPanel tabId="library" value={tab} idPrefix="fe-media">
        {entries.length === 0 ? (
          <p className="fe-media-empty">
            No {kind ?? "media"} in this course yet. Use Upload or URL to add
            some.
          </p>
        ) : (
          <div className="fe-media-grid">
            {entries.map((ref) => {
              const url = mediaUrls[ref.id];
              const usageCount = usageCounts.get(ref.id) ?? 0;
              return (
                <AssetTile
                  key={ref.id}
                  className="fe-media-item"
                  role="button"
                  tabIndex={0}
                  title={ref.filename}
                  meta={`${ref.kind} · ${usageCount} ${usageCount === 1 ? "use" : "uses"}`}
                  preview={
                    ref.kind === "image" && url ? (
                      <img src={url} alt={ref.alt ?? ref.filename} />
                    ) : (
                      kindIcon(ref.kind)
                    )
                  }
                  onClick={() => {
                    onSelect(ref.id);
                    onClose();
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelect(ref.id);
                    onClose();
                  }}
                >
                  {ref.alt ? <span>Alt: {ref.alt}</span> : null}
                </AssetTile>
              );
            })}
          </div>
        )}
      </TabPanel>

      <TabPanel tabId="upload" value={tab} idPrefix="fe-media">
        {pending ? (
          <div className="fe-media-pending">
            <span className="fe-media-thumb">
              <img src={pending.objectUrl} alt="" />
            </span>
            <div className="fe-media-pending-fields">
              <UploadProgressRow
                filename={pending.file.name}
                progress={100}
                meta={`${Math.round(pending.file.size / 1024)} KB`}
                status="Ready"
              />
              <label className="fe-field">
                <span className="fe-field-label">Alt text (required)</span>
                <Input
                  value={alt}
                  onChange={(event) => setAlt(event.target.value)}
                  placeholder="Describe this image"
                />
              </label>
              <div className="fe-dlg-footer">
                <Button onClick={cancelPending}>Cancel</Button>
                <Button
                  variant="primary"
                  disabled={alt.trim().length === 0}
                  onClick={() => commitFile(pending, alt)}
                >
                  Add image
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Dropzone
            className="fe-dropzone"
            title="Upload to course library"
            description="Drag and drop a file here, or choose one from your device."
            icon={<UploadCloud size={28} aria-hidden />}
            active={dragOver}
            actions={
              <Button
                iconStart={<UploadCloud size={14} aria-hidden />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
            }
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT[kind ?? "attachment"]}
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
          </Dropzone>
        )}
      </TabPanel>

      <TabPanel tabId="url" value={tab} idPrefix="fe-media">
        <div>
          <label className="fe-field">
            <span className="fe-field-label">Media URL</span>
            <Input
              value={urlValue}
              onChange={(event) => setUrlValue(event.target.value)}
              placeholder="https://example.com/asset.png"
              inputMode="url"
            />
          </label>
          {(kind ?? "image") === "image" ? (
            <label className="fe-field">
              <span className="fe-field-label">
                Alt text (required for images)
              </span>
              <Input
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                placeholder="Describe this image"
              />
            </label>
          ) : null}
          <div className="fe-dlg-footer">
            <Button
              variant="primary"
              disabled={urlValue.trim().length === 0}
              onClick={addFromUrl}
            >
              Add
            </Button>
          </div>
        </div>
      </TabPanel>

      {error ? (
        <p className="fe-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}

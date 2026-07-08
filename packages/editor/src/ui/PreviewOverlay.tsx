// Full-screen preview mounting the REAL @forge/player against the draft
// CourseDoc. Same BlockView on both sides: this is the WYSIWYG guarantee.
import type { ReactElement } from "react";
import { useCallback } from "react";
import { X } from "lucide-react";
import { Player, previewDeviceWidths } from "@forge/player";
import type { PreviewDevice } from "@forge/player";
import { useStore } from "../state/store.js";

export interface PreviewOverlayProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  onClose: () => void;
}

export function PreviewOverlay({
  device,
  onDeviceChange,
  onClose,
}: PreviewOverlayProps): ReactElement | null {
  const course = useStore((state) => state.course);
  const mediaUrls = useStore((state) => state.mediaUrls);

  const resolveMediaUrl = useCallback(
    (mediaId: string) => mediaUrls[mediaId],
    [mediaUrls],
  );

  if (!course) return null;

  const width = previewDeviceWidths[device];

  return (
    <div className="fe-preview-overlay" role="dialog" aria-modal="true" aria-label="Course preview">
      <div className="fe-preview-topbar">
        <button
          type="button"
          className="fe-preview-close"
          onClick={onClose}
          title="Back to editing"
        >
          <X size={16} aria-hidden />
          <span>Back to editing</span>
        </button>
        <span className="fe-preview-title">
          <span className="fe-preview-kicker">Course preview</span>
          {course.title}
        </span>
        <span className="fe-device-toggle" role="group" aria-label="Preview device">
          {(Object.keys(previewDeviceWidths) as PreviewDevice[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`fe-device-btn${device === item ? " fe-device-btn-active" : ""}`}
              onClick={() => onDeviceChange(item)}
              aria-pressed={device === item}
            >
              {item}
            </button>
          ))}
        </span>
      </div>
      <div className="fe-preview-stage">
        <div
          className={`fe-preview-frame fe-preview-frame-${device}`}
          style={{ width: `${width}px` }}
        >
          <div className="fe-preview-screen">
            <Player
              course={course}
              resolveMediaUrl={resolveMediaUrl}
              hideCover={false}
              onExit={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

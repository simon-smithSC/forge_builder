import type { ReactElement } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  Languages,
  Monitor,
  Palette,
  Play,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import type { PreviewDevice } from "@forge/player";
import {
  closeCourse,
  redo,
  setCourseMeta,
  undo,
} from "../state/actions.js";
import { useStore } from "../state/store.js";
import type { SaveStatus } from "../state/store.js";
import { LabelSetEditor } from "./dialogs/LabelSetEditor.js";
import { ThemeEditor } from "./dialogs/ThemeEditor.js";

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "All changes saved",
  saving: "Saving...",
  offline: "Offline, changes queued",
  conflict: "Save conflict",
};

const DEVICES: { id: PreviewDevice; label: string }[] = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

function deviceIcon(device: PreviewDevice): ReactElement {
  if (device === "phone") return <Smartphone size={14} aria-hidden />;
  if (device === "tablet") return <Tablet size={14} aria-hidden />;
  return <Monitor size={14} aria-hidden />;
}

export interface TopBarProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  onPreview: () => void;
}

export function TopBar({ device, onDeviceChange, onPreview }: TopBarProps): ReactElement {
  const title = useStore((state) => state.course?.title ?? "");
  const saveStatus = useStore((state) => state.saveStatus);
  const canUndo = useStore((state) => state.canUndo);
  const canRedo = useStore((state) => state.canRedo);
  const [themeOpen, setThemeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);

  return (
    <header className="fe-topbar">
      <button
        type="button"
        className="fe-icon-btn"
        onClick={() => closeCourse()}
        title="Back to courses"
        aria-label="Back to courses"
      >
        <ArrowLeft size={18} aria-hidden />
      </button>

      <input
        className="fe-title-input"
        value={title}
        onChange={(event) => setCourseMeta({ title: event.target.value })}
        aria-label="Course title"
        placeholder="Course title"
      />

      <span
        className={`fe-save-status fe-save-status-${saveStatus}`}
        aria-live="polite"
      >
        {STATUS_LABEL[saveStatus]}
      </span>

      <span className="fe-topbar-spacer" />

      <button
        type="button"
        className="fe-icon-btn"
        onClick={() => undo()}
        disabled={!canUndo}
        title="Undo"
        aria-label="Undo"
      >
        <Undo2 size={18} aria-hidden />
      </button>
      <button
        type="button"
        className="fe-icon-btn"
        onClick={() => redo()}
        disabled={!canRedo}
        title="Redo"
        aria-label="Redo"
      >
        <Redo2 size={18} aria-hidden />
      </button>

      <button
        type="button"
        className="fe-btn"
        onClick={() => setThemeOpen(true)}
        title="Edit course theme"
      >
        <Palette size={14} aria-hidden />
        Theme
      </button>
      <button
        type="button"
        className="fe-btn"
        onClick={() => setLabelsOpen(true)}
        title="Edit course labels"
      >
        <Languages size={14} aria-hidden />
        Labels
      </button>

      <span className="fe-device-toggle" role="group" aria-label="Preview device">
        {DEVICES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`fe-device-btn${device === item.id ? " fe-device-btn-active" : ""}`}
            onClick={() => onDeviceChange(item.id)}
            title={item.label}
            aria-label={`Preview as ${item.label}`}
            aria-pressed={device === item.id}
          >
            {deviceIcon(item.id)}
          </button>
        ))}
      </span>

      <button type="button" className="fe-btn fe-btn-primary" onClick={onPreview}>
        <Play size={14} aria-hidden />
        Preview
      </button>

      <ThemeEditor open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LabelSetEditor open={labelsOpen} onClose={() => setLabelsOpen(false)} />
    </header>
  );
}

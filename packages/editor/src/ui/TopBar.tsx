import type { ReactElement } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  Languages,
  Monitor,
  Palette,
  PanelLeft,
  Play,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
  UploadCloud,
} from "lucide-react";
import type { PreviewDevice } from "@forge/player";
import { Badge, Button, IconButton, SegmentedControl } from "@forge/ui";
import {
  redo,
  setCourseMeta,
  showCourseOverview,
  undo,
} from "../state/actions.js";
import { useStore } from "../state/store.js";
import type { SaveStatus } from "../state/store.js";
import { LabelSetEditor } from "./dialogs/LabelSetEditor.js";
import { ThemeEditor } from "./dialogs/ThemeEditor.js";
import { PublishDialog } from "./publish/PublishDialog.js";

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "All changes saved",
  saving: "Saving...",
  offline: "Offline, changes queued",
  conflict: "Save conflict",
};

const STATUS_TONE: Record<SaveStatus, "success" | "neutral" | "warn" | "danger"> = {
  saved: "success",
  saving: "neutral",
  offline: "warn",
  conflict: "danger",
};

function deviceIcon(device: PreviewDevice): ReactElement {
  if (device === "phone") return <Smartphone size={14} aria-hidden />;
  if (device === "tablet") return <Tablet size={14} aria-hidden />;
  return <Monitor size={14} aria-hidden />;
}

const DEVICES: { id: PreviewDevice; label: string }[] = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export interface TopBarProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  onPreview: () => void;
  /** Toggles the outline overlay on narrow viewports (button is CSS-hidden
      above 900px). */
  onToggleOutline: () => void;
}

export function TopBar({
  device,
  onDeviceChange,
  onPreview,
  onToggleOutline,
}: TopBarProps): ReactElement {
  const title = useStore((state) => state.course?.title ?? "");
  const saveStatus = useStore((state) => state.saveStatus);
  const canUndo = useStore((state) => state.canUndo);
  const canRedo = useStore((state) => state.canRedo);
  const [themeOpen, setThemeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  return (
    <header className="fe-topbar">
      <IconButton
        className="fe-outline-toggle"
        label="Toggle lesson outline"
        icon={<PanelLeft size={18} aria-hidden />}
        onClick={onToggleOutline}
      />
      <IconButton
        label="Back to course overview"
        icon={<ArrowLeft size={18} aria-hidden />}
        onClick={() => showCourseOverview()}
      />

      <input
        className="fe-title-input"
        value={title}
        onChange={(event) => setCourseMeta({ title: event.target.value })}
        aria-label="Course title"
        placeholder="Course title"
      />

      <Badge className="fe-save-badge" tone={STATUS_TONE[saveStatus]} aria-live="polite">
        {STATUS_LABEL[saveStatus]}
      </Badge>

      <span className="fe-topbar-spacer" />

      <IconButton
        label="Undo"
        icon={<Undo2 size={18} aria-hidden />}
        onClick={() => undo()}
        disabled={!canUndo}
      />
      <IconButton
        label="Redo"
        icon={<Redo2 size={18} aria-hidden />}
        onClick={() => redo()}
        disabled={!canRedo}
      />

      <Button
        iconStart={<Palette size={14} aria-hidden />}
        onClick={() => setThemeOpen(true)}
        title="Edit course theme"
      >
        Theme
      </Button>
      <Button
        iconStart={<Languages size={14} aria-hidden />}
        onClick={() => setLabelsOpen(true)}
        title="Edit course labels"
      >
        Labels
      </Button>

      <SegmentedControl
        label="Preview device"
        value={device}
        onValueChange={(next) => onDeviceChange(next as PreviewDevice)}
        options={DEVICES.map((item) => ({
          value: item.id,
          label: (
            <span title={item.label} aria-label={`Preview as ${item.label}`}>
              {deviceIcon(item.id)}
            </span>
          ),
        }))}
      />

      <Button
        variant="primary"
        iconStart={<Play size={14} aria-hidden />}
        onClick={onPreview}
      >
        Preview
      </Button>

      <Button
        variant="primary"
        iconStart={<UploadCloud size={14} aria-hidden />}
        onClick={() => setPublishOpen(true)}
        title="Publish as xAPI package"
      >
        Publish
      </Button>

      <ThemeEditor open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LabelSetEditor open={labelsOpen} onClose={() => setLabelsOpen(false)} />
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />
    </header>
  );
}

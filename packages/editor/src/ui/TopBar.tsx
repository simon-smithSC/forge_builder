import type { ReactElement } from "react";
import { useState } from "react";
import type { PreviewDevice } from "@forge/player";
import {
  Badge,
  Button,
  Divider,
  Icon,
  IconButton,
  SegmentedControl,
  Wordmark,
} from "@forge/ui";
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
import { ThemeToggle } from "./ThemeToggle.js";

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
  if (device === "phone") return <Icon name="smartphone" size={14} />;
  if (device === "tablet") return <Icon name="tablet" size={14} />;
  return <Icon name="monitor" size={14} />;
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
  /** Universal outline toggle: collapses the rail on desktop, opens the
      slide-in overlay below 900px (EditorScreen decides at call time). */
  onToggleOutline: () => void;
  /** Desktop collapse state, for aria-expanded + the tooltip verb. */
  outlineCollapsed: boolean;
  /** Canvas scroll state (5B.2): the bar idles flat and gains elevation
      only while content is scrolled beneath it. */
  scrolled?: boolean;
}

export function TopBar({
  device,
  onDeviceChange,
  onPreview,
  onToggleOutline,
  outlineCollapsed,
  scrolled = false,
}: TopBarProps): ReactElement {
  const title = useStore((state) => state.course?.title ?? "");
  const saveStatus = useStore((state) => state.saveStatus);
  const canUndo = useStore((state) => state.canUndo);
  const canRedo = useStore((state) => state.canRedo);
  const [themeOpen, setThemeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  return (
    <header className="fe-topbar" data-scrolled={scrolled ? "true" : undefined}>
      <Wordmark />
      <IconButton
        className="fe-outline-toggle"
        label={outlineCollapsed ? "Show outline" : "Hide outline"}
        title={
          outlineCollapsed ? "Show outline (⌘\\)" : "Hide outline (⌘\\)"
        }
        icon={<Icon name="panel-left" size={18} />}
        onClick={onToggleOutline}
        aria-expanded={!outlineCollapsed}
      />
      <IconButton
        label="Back to course overview"
        icon={<Icon name="arrow-left" size={18} />}
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
        icon={<Icon name="undo-2" size={18} />}
        onClick={() => undo()}
        disabled={!canUndo}
      />
      <IconButton
        label="Redo"
        icon={<Icon name="redo-2" size={18} />}
        onClick={() => redo()}
        disabled={!canRedo}
      />

      <Divider orientation="vertical" className="fe-topbar-divider" />

      <ThemeToggle />

      <Button
        iconStart={<Icon name="palette" size={14} />}
        onClick={() => setThemeOpen(true)}
        title="Edit course theme"
      >
        Theme
      </Button>
      <Button
        iconStart={<Icon name="languages" size={14} />}
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

      <Divider orientation="vertical" className="fe-topbar-divider" />

      <Button
        variant="secondary"
        iconStart={<Icon name="play" size={14} />}
        onClick={onPreview}
      >
        Preview
      </Button>

      <Button
        variant="primary"
        iconStart={<Icon name="upload-cloud" size={14} />}
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

// Header bar for the course overview screen. Slim variant of ui/TopBar.tsx:
// back goes to the course LIST (the overview is the course's home), and the
// title lives in the page body, so the bar only carries status + actions.
// Owns the same dialogs (theme/labels/publish) and the whole-course preview.
import type { ReactElement } from "react";
import { useState } from "react";
import {
  ArrowLeft,
  Languages,
  Palette,
  Play,
  Redo2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import type { PreviewDevice } from "@forge/player";
import { closeCourse, redo, undo } from "../../state/actions.js";
import { useStore } from "../../state/store.js";
import type { SaveStatus } from "../../state/store.js";
import { LabelSetEditor } from "../dialogs/LabelSetEditor.js";
import { ThemeEditor } from "../dialogs/ThemeEditor.js";
import { PreviewOverlay } from "../PreviewOverlay.js";
import { PublishDialog } from "../publish/PublishDialog.js";

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "All changes saved",
  saving: "Saving...",
  offline: "Offline, changes queued",
  conflict: "Save conflict",
};

export function OverviewHeader(): ReactElement {
  const saveStatus = useStore((state) => state.saveStatus);
  const canUndo = useStore((state) => state.canUndo);
  const canRedo = useStore((state) => state.canRedo);
  const [themeOpen, setThemeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

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

      <button
        type="button"
        className="fe-btn fe-btn-primary"
        onClick={() => setPreviewOpen(true)}
      >
        <Play size={14} aria-hidden />
        Preview
      </button>

      <button
        type="button"
        className="fe-btn fe-btn-primary"
        onClick={() => setPublishOpen(true)}
        title="Publish as xAPI package"
      >
        <UploadCloud size={14} aria-hidden />
        Publish
      </button>

      <ThemeEditor open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LabelSetEditor open={labelsOpen} onClose={() => setLabelsOpen(false)} />
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} />
      {previewOpen ? (
        <PreviewOverlay
          device={device}
          onDeviceChange={setDevice}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </header>
  );
}

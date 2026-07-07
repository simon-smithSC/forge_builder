// Three-region editor layout per SPEC 4.1: outline / canvas / settings panel,
// with the top bar, conflict banner, journal restore banner, and preview.
import type { ReactElement } from "react";
import { useState } from "react";
import type { PreviewDevice } from "@forge/player";
import {
  dismissRestore,
  restoreFromJournal,
} from "../state/actions.js";
import {
  overwriteServerCopy,
  reloadServerCopy,
} from "../state/persistence.js";
import { useStore } from "../state/store.js";
import { Canvas } from "./Canvas.js";
import { Outline } from "./Outline.js";
import { PreviewOverlay } from "./PreviewOverlay.js";
import { SettingsPanel } from "./SettingsPanel.js";
import { TopBar } from "./TopBar.js";

export function EditorScreen(): ReactElement {
  const saveStatus = useStore((state) => state.saveStatus);
  const restoreCandidate = useStore((state) => state.restoreCandidate);
  const hasSelectedBlock = useStore((state) => state.selectedBlockId !== null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  return (
    <div className="fe-editor">
      <TopBar
        device={device}
        onDeviceChange={setDevice}
        onPreview={() => setPreviewOpen(true)}
      />

      {saveStatus === "conflict" ? (
        <div className="fe-banner fe-banner-conflict" role="alert">
          <span>
            Someone else changed this course. Your latest edits could not be
            saved.
          </span>
          <span className="fe-banner-actions">
            <button
              type="button"
              className="fe-btn"
              onClick={() => void reloadServerCopy()}
            >
              Reload server copy
            </button>
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              onClick={() => void overwriteServerCopy()}
            >
              Overwrite
            </button>
          </span>
        </div>
      ) : null}

      {restoreCandidate ? (
        <div className="fe-banner fe-banner-restore" role="alert">
          <span>
            Unsaved changes from this device were found (
            {restoreCandidate.lessonIds.length}{" "}
            {restoreCandidate.lessonIds.length === 1 ? "lesson" : "lessons"}).
          </span>
          <span className="fe-banner-actions">
            <button
              type="button"
              className="fe-btn"
              onClick={() => void dismissRestore()}
            >
              Discard
            </button>
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              onClick={() => void restoreFromJournal()}
            >
              Restore unsaved changes from this device
            </button>
          </span>
        </div>
      ) : null}

      <div className="fe-editor-body">
        <Outline />
        <Canvas />
        {hasSelectedBlock ? <SettingsPanel /> : null}
      </div>

      {previewOpen ? (
        <PreviewOverlay
          device={device}
          onDeviceChange={setDevice}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

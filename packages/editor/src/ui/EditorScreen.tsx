// Three-region editor layout per SPEC 4.1: outline / canvas / settings panel,
// with the top bar, conflict banner, journal restore banner, and preview.
import type { ReactElement } from "react";
import { useState } from "react";
import type { PreviewDevice } from "@forge/player";
import { Button } from "@forge/ui";
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
  // Below 900px the outline is an overlay driven by the topbar toggle; on
  // wider viewports the wrapper is a plain flex column and this is inert.
  const [outlineOpen, setOutlineOpen] = useState(false);

  return (
    <div className="fe-editor">
      <TopBar
        device={device}
        onDeviceChange={setDevice}
        onPreview={() => setPreviewOpen(true)}
        onToggleOutline={() => setOutlineOpen((open) => !open)}
      />

      {saveStatus === "conflict" ? (
        <div className="fe-banner fe-banner-conflict" role="alert">
          <span>
            Someone else changed this course. Your latest edits could not be
            saved.
          </span>
          <span className="fe-banner-actions">
            <Button size="sm" onClick={() => void reloadServerCopy()}>
              Reload server copy
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void overwriteServerCopy()}
            >
              Overwrite
            </Button>
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
            <Button size="sm" onClick={() => void dismissRestore()}>
              Discard
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void restoreFromJournal()}
            >
              Restore unsaved changes from this device
            </Button>
          </span>
        </div>
      ) : null}

      <div className="fe-editor-body">
        <div
          className={`fe-outline-wrap${outlineOpen ? " fe-outline-wrap-open" : ""}`}
        >
          <Outline />
        </div>
        <Canvas />
        {/* The drawer column collapses to width 0 when closed (not merely
            emptied) so the canvas reflows to fill; the width transition
            lives on this wrapper. */}
        <div
          className={`fe-drawer${hasSelectedBlock ? " fe-drawer-open" : ""}`}
          aria-hidden={!hasSelectedBlock}
        >
          {hasSelectedBlock ? <SettingsPanel /> : null}
        </div>
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

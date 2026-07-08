// Three-region editor layout per SPEC 4.1: outline / canvas / settings panel,
// with the top bar, conflict banner, journal restore banner, and preview.
import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import type { PreviewDevice } from "@forge/player";
import { Button, toast } from "@forge/ui";
import {
  dismissRestore,
  restoreFromJournal,
} from "../state/actions.js";
import {
  overwriteServerCopy,
  reloadServerCopy,
} from "../state/persistence.js";
import { editorStore, useStore } from "../state/store.js";
import { Canvas } from "./Canvas.js";
import { Outline } from "./Outline.js";
import { PreviewOverlay } from "./PreviewOverlay.js";
import { SettingsPanel } from "./SettingsPanel.js";
import { TopBar } from "./TopBar.js";
import { OUTLINE_COLLAPSED_PREF, readPref, writePref } from "./uiPrefs.js";
import { useScrolled } from "./useScrolled.js";

export function EditorScreen(): ReactElement {
  const saveStatus = useStore((state) => state.saveStatus);
  const restoreCandidate = useStore((state) => state.restoreCandidate);
  // The tray needs BOTH a selected block and an explicit open flag (V1.1):
  // selection alone paints the ring + rail, never the drawer.
  const hasSelectedBlock = useStore((state) => state.selectedBlockId !== null);
  const settingsOpen = useStore((state) => state.settingsOpen);
  const trayOpen = settingsOpen && hasSelectedBlock;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  // Below 900px the outline is an overlay driven by the topbar toggle; on
  // wider viewports the wrapper is a plain flex column and this is inert.
  const [outlineOpen, setOutlineOpen] = useState(false);
  // Desktop (>=900px) collapse state, persisted as a UI pref (V1.3).
  const [outlineCollapsed, setOutlineCollapsed] = useState(
    () => readPref(OUTLINE_COLLAPSED_PREF) === "1",
  );
  // Scroll-aware topbar (5B.2): flat at rest, elevation once the canvas moves.
  const { scrollRef, scrolled } = useScrolled<HTMLElement>();

  const toggleOutlineCollapsed = useCallback(() => {
    setOutlineCollapsed((prev) => {
      const next = !prev;
      writePref(OUTLINE_COLLAPSED_PREF, next ? "1" : "0");
      return next;
    });
  }, []);

  // One topbar handler for both modes: desktop toggles the collapse, narrow
  // viewports keep the slide-in overlay behaviour.
  const handleToggleOutline = useCallback(() => {
    if (window.matchMedia("(min-width: 900px)").matches) {
      toggleOutlineCollapsed();
    } else {
      setOutlineOpen((open) => !open);
    }
  }, [toggleOutlineCollapsed]);

  // Cmd/Ctrl+\ toggles the outline; ignore keystrokes inside editable
  // surfaces (Cmd+B stays reserved for the V2 rich-text bold).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "\\" || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, [contenteditable='true'], [contenteditable='']")
      ) {
        return;
      }
      event.preventDefault();
      handleToggleOutline();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleToggleOutline]);

  const outlineWrapClasses = [
    "fe-outline-wrap",
    outlineOpen ? "fe-outline-wrap-open" : "",
    outlineCollapsed ? "fe-outline-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fe-editor">
      <TopBar
        device={device}
        onDeviceChange={setDevice}
        onPreview={() => setPreviewOpen(true)}
        onToggleOutline={handleToggleOutline}
        outlineCollapsed={outlineCollapsed}
        scrolled={scrolled}
      />

      {saveStatus === "conflict" ? (
        <div className="fe-banner fe-banner-conflict" role="alert">
          <span>
            Someone else changed this course. Your latest edits could not be
            saved.
          </span>
          <span className="fe-banner-actions">
            <Button
              size="sm"
              onClick={() =>
                void reloadServerCopy().then(() => {
                  // Recovery OUTCOME is transient (5A.6); the conflict state
                  // itself stays this persistent banner.
                  toast("Server copy reloaded. Local edits were discarded.", {
                    tone: "info",
                  });
                })
              }
            >
              Reload server copy
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                void overwriteServerCopy().then(() => {
                  if (editorStore.getState().saveStatus === "saved") {
                    toast("Server updated with your copy.", { tone: "success" });
                  }
                })
              }
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
        {/* inert only applies while collapsed AND the mobile overlay is
            closed, so a stored desktop pref never disables the overlay. */}
        <div
          className={outlineWrapClasses}
          inert={outlineCollapsed && !outlineOpen}
          aria-hidden={outlineCollapsed && !outlineOpen}
        >
          <Outline
            collapsed={outlineCollapsed}
            onToggleCollapse={handleToggleOutline}
          />
        </div>
        <Canvas scrollRef={scrollRef} />
        {/* The drawer column collapses to width 0 when closed (not merely
            emptied) so the canvas reflows to fill; the width transition
            lives on this wrapper. */}
        <div
          className={`fe-drawer${trayOpen ? " fe-drawer-open" : ""}`}
          aria-hidden={!trayOpen}
        >
          {trayOpen ? <SettingsPanel /> : null}
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

// Three-region editor layout per SPEC 4.1: outline / canvas / settings panel,
// with the top bar, conflict banner, journal restore banner, and preview.
import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewDevice } from "@forge/player";
import { Button, Collapse, Presence, toast } from "@forge/ui";
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
  // Last non-null candidate: the restore banner keeps rendering its lesson
  // count while its Collapse plays the exit (motion M7). Render-phase update;
  // rewriting the same value is harmless.
  const lastRestoreCandidateRef = useRef(restoreCandidate);
  if (restoreCandidate) lastRestoreCandidateRef.current = restoreCandidate;
  const lastRestoreCandidate = lastRestoreCandidateRef.current;
  // The tray needs BOTH a selected block and an explicit open flag (V1.1):
  // selection alone paints the ring + rail, never the drawer.
  const hasSelectedBlock = useStore((state) => state.selectedBlockId !== null);
  const settingsOpen = useStore((state) => state.settingsOpen);
  const trayOpen = settingsOpen && hasSelectedBlock;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  // Motion M5 (#13): the preview steals focus (Player chrome); remember where
  // it came from and give it back the moment close STARTS, so the author is
  // never stranded in the fading (inert) overlay.
  const previewReturnFocusRef = useRef<HTMLElement | null>(null);
  const openPreview = useCallback(() => {
    previewReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPreviewOpen(true);
  }, []);
  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    previewReturnFocusRef.current?.focus();
    previewReturnFocusRef.current = null;
  }, []);
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
        onPreview={openPreview}
        onToggleOutline={handleToggleOutline}
        outlineCollapsed={outlineCollapsed}
        scrolled={scrolled}
      />

      {/* Motion M7 (#14): Collapse animates the height so the layout column
          glides instead of jumping; the fe-banner fades against the wrapper's
          data-state. keepMounted={false} keeps today's role="alert" semantics:
          the alert enters the DOM only when the condition fires, so screen
          readers announce it, and while open it is a plain, fully interactive
          banner - only the enter/exit animates. */}
      <Collapse
        className="fe-banner-collapse"
        open={saveStatus === "conflict"}
        keepMounted={false}
      >
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
      </Collapse>

      <Collapse
        className="fe-banner-collapse"
        open={restoreCandidate !== null}
        keepMounted={false}
      >
        {/* The candidate goes null the moment the author acts, but the banner
            stays mounted while the Collapse closes - render from the last
            non-null snapshot so the fading copy keeps its lesson count. */}
        {lastRestoreCandidate ? (
          <div className="fe-banner fe-banner-restore" role="alert">
            <span>
              Unsaved changes from this device were found (
              {lastRestoreCandidate.lessonIds.length}{" "}
              {lastRestoreCandidate.lessonIds.length === 1
                ? "lesson"
                : "lessons"}
              ).
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
      </Collapse>

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
            lives on this wrapper. Motion M6: Presence renders the wrapper and
            keeps SettingsPanel mounted until the width transitionend, so the
            drawer no longer collapses empty; while closing it goes inert and
            aria-hidden, matching the old instant unmount for focus and AT. */}
        <Presence open={trayOpen}>
          {(presence) => {
            const closing = presence["data-state"] === "closed";
            return (
              <div
                ref={presence.ref}
                data-state={presence["data-state"]}
                className="fe-drawer"
                aria-hidden={closing || undefined}
                {...(closing ? { inert: true } : {})}
              >
                <SettingsPanel />
              </div>
            );
          }}
        </Presence>
      </div>

      <Presence open={previewOpen}>
        {(presence) => (
          <PreviewOverlay
            device={device}
            onDeviceChange={setDevice}
            onClose={closePreview}
            presence={presence}
          />
        )}
      </Presence>
    </div>
  );
}

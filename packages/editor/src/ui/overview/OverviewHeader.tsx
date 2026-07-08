// Header bar for the course overview screen. Slim variant of ui/TopBar.tsx:
// back goes to the course LIST (the overview is the course's home), and the
// title lives in the page body, so the bar only carries status + actions.
// Owns the same dialogs (theme/labels/publish) and the whole-course preview.
import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
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
import { Badge, Button, Divider, IconButton, Presence, Wordmark } from "@forge/ui";
import { closeCourse, redo, undo } from "../../state/actions.js";
import { useStore } from "../../state/store.js";
import type { SaveStatus } from "../../state/store.js";
import { LabelSetEditor } from "../dialogs/LabelSetEditor.js";
import { ThemeEditor } from "../dialogs/ThemeEditor.js";
import { PreviewOverlay } from "../PreviewOverlay.js";
import { PublishDialog } from "../publish/PublishDialog.js";
import { ThemeToggle } from "../ThemeToggle.js";

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

export interface OverviewHeaderProps {
  /** Overview scroll state (5B.2): the bar idles flat and gains elevation
      only while content is scrolled beneath it. */
  scrolled?: boolean;
}

export function OverviewHeader({ scrolled = false }: OverviewHeaderProps): ReactElement {
  const saveStatus = useStore((state) => state.saveStatus);
  const canUndo = useStore((state) => state.canUndo);
  const canRedo = useStore((state) => state.canRedo);
  const [themeOpen, setThemeOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  // Motion M5 (#13): same focus contract as EditorScreen - remember where
  // focus came from and give it back the moment close STARTS, while the
  // (inert) overlay is still fading.
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

  return (
    <header className="fe-topbar" data-scrolled={scrolled ? "true" : undefined}>
      <Wordmark />
      <IconButton
        label="Back to courses"
        icon={<ArrowLeft size={18} aria-hidden />}
        onClick={() => closeCourse()}
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

      <Divider orientation="vertical" className="fe-topbar-divider" />

      <ThemeToggle />

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

      <Divider orientation="vertical" className="fe-topbar-divider" />

      <Button
        variant="secondary"
        iconStart={<Play size={14} aria-hidden />}
        onClick={openPreview}
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
    </header>
  );
}

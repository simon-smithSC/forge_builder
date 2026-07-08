// Right edit drawer (Rise parity P3-lite): titled "Edit {variant}", content
// and structure editors first, the envelope settings demoted into a
// collapsed Format section at the bottom (also the target of the rail's
// Style/Format control).
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, IconButton, Input } from "@forge/ui";
import { getRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import { closeBlockSettings, setBlockSettings } from "../state/actions.js";
import { useStore } from "../state/store.js";
import { PayloadEditor } from "./PayloadEditor.js";
import { editTitle } from "./variantLabels.js";

const ANCHOR_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function EnvelopeSettings({
  lessonId,
  block,
}: {
  lessonId: string;
  block: Block;
}): ReactElement {
  const [anchorDraft, setAnchorDraft] = useState(block.settings.anchorId ?? "");
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const commitAnchor = (raw: string): void => {
    setAnchorDraft(raw);
    if (raw === "") {
      setAnchorError(null);
      setBlockSettings(lessonId, block.id, { anchorId: undefined });
      return;
    }
    if (!ANCHOR_PATTERN.test(raw)) {
      setAnchorError("Must start with a letter; letters, digits, - and _ only.");
      return;
    }
    setAnchorError(null);
    setBlockSettings(lessonId, block.id, { anchorId: raw });
  };

  return (
    <section className="fe-settings-section">
      <label className="fe-field">
        <span className="fe-field-label">
          Padding top ({block.settings.paddingTop})
        </span>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={block.settings.paddingTop}
          onChange={(event) =>
            setBlockSettings(lessonId, block.id, {
              paddingTop: Number(event.target.value),
            })
          }
        />
      </label>

      <label className="fe-field">
        <span className="fe-field-label">
          Padding bottom ({block.settings.paddingBottom})
        </span>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={block.settings.paddingBottom}
          onChange={(event) =>
            setBlockSettings(lessonId, block.id, {
              paddingBottom: Number(event.target.value),
            })
          }
        />
      </label>

      <div className="fe-field">
        <span className="fe-field-label">Background color</span>
        <span className="fe-field-row">
          <input
            type="color"
            value={block.settings.backgroundColor ?? "#ffffff"}
            onChange={(event) =>
              setBlockSettings(lessonId, block.id, {
                backgroundColor: event.target.value,
              })
            }
            aria-label="Background color"
          />
          <Button
            size="sm"
            onClick={() =>
              setBlockSettings(lessonId, block.id, { backgroundColor: undefined })
            }
            disabled={block.settings.backgroundColor === undefined}
          >
            Clear
          </Button>
        </span>
      </div>

      {/* textColorMode UI removed (V2): per-selection color now lives in the
          rich text toolbar. The schema field and renderer support stay so
          existing courses remain valid. */}
      <label className="fe-field">
        <span className="fe-field-label">Anchor id</span>
        <Input
          value={anchorDraft}
          onChange={(event) => commitAnchor(event.target.value)}
          placeholder="e.g. key-takeaways"
          invalid={anchorError !== null}
        />
        {anchorError ? <span className="fe-field-error">{anchorError}</span> : null}
      </label>
    </section>
  );
}

export function SettingsPanel(): ReactElement | null {
  const course = useStore((state) => state.course);
  const selectedLessonId = useStore((state) => state.selectedLessonId);
  const selectedBlockId = useStore((state) => state.selectedBlockId);

  const liveLesson = course?.lessons.find((item) => item.id === selectedLessonId);
  const liveBlock =
    liveLesson?.type === "blocks"
      ? liveLesson.blocks.find((item) => item.id === selectedBlockId)
      : undefined;

  // Motion M6: the drawer wrapper (EditorScreen) holds this panel mounted
  // while its width transition closes. Deselecting clears the live block
  // immediately, so keep the last rendered pair - the closing (inert) drawer
  // then slides away still showing its content instead of emptying. Render-
  // phase ref update; rewriting the same pair is harmless.
  const lastContentRef = useRef<{ lessonId: string; block: Block } | null>(null);
  if (liveLesson && liveBlock) {
    lastContentRef.current = { lessonId: liveLesson.id, block: liveBlock };
  }
  const content =
    liveLesson && liveBlock
      ? { lessonId: liveLesson.id, block: liveBlock }
      : lastContentRef.current;

  if (!content) return null;

  const { lessonId, block } = content;
  const entry = getRegistryEntry(block.family);

  return (
    // Closing keeps the block selected (V1.1): X and Escape only dismiss
    // the tray; the canvas ring + rail stay.
    <aside
      className="fe-settings"
      aria-label="Block settings"
      onKeyDown={(event) => {
        if (event.key === "Escape") closeBlockSettings();
      }}
    >
      <div className="fe-settings-header">
        <span>{editTitle(entry.palette.label, block.variant)}</span>
        <IconButton
          label="Close settings"
          icon={<X size={16} aria-hidden />}
          onClick={() => closeBlockSettings()}
        />
      </div>
      <section className="fe-settings-section">
        <h3>Content</h3>
        <PayloadEditor key={`payload-${block.id}-${block.variant}`} lessonId={lessonId} block={block} />
      </section>
      <details className="fe-settings-format">
        <summary>Format</summary>
        <EnvelopeSettings key={`env-${block.id}`} lessonId={lessonId} block={block} />
      </details>
    </aside>
  );
}

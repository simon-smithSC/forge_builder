// Right settings panel: envelope settings bound to schema BlockSettings plus
// the generic payload editor. // R2: purpose-built per-family editors.
import type { ReactElement } from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { getRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import { selectBlock, setBlockSettings } from "../state/actions.js";
import { useStore } from "../state/store.js";
import { PayloadEditor } from "./PayloadEditor.js";

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

  const explicitColor =
    typeof block.settings.textColorMode === "object"
      ? block.settings.textColorMode.color
      : "#1f2328";

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
      <h3>Block settings</h3>

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
          <button
            type="button"
            className="fe-btn fe-btn-sm"
            onClick={() =>
              setBlockSettings(lessonId, block.id, { backgroundColor: undefined })
            }
            disabled={block.settings.backgroundColor === undefined}
          >
            Clear
          </button>
        </span>
      </div>

      <div className="fe-field">
        <span className="fe-field-label">Text color</span>
        <span className="fe-field-row">
          <label className="fe-radio">
            <input
              type="radio"
              name={`fe-tcm-${block.id}`}
              checked={block.settings.textColorMode === "auto"}
              onChange={() =>
                setBlockSettings(lessonId, block.id, { textColorMode: "auto" })
              }
            />
            Auto
          </label>
          <label className="fe-radio">
            <input
              type="radio"
              name={`fe-tcm-${block.id}`}
              checked={block.settings.textColorMode !== "auto"}
              onChange={() =>
                setBlockSettings(lessonId, block.id, {
                  textColorMode: { mode: "explicit", color: explicitColor },
                })
              }
            />
            Explicit
          </label>
          {block.settings.textColorMode !== "auto" ? (
            <input
              type="color"
              value={explicitColor}
              onChange={(event) =>
                setBlockSettings(lessonId, block.id, {
                  textColorMode: { mode: "explicit", color: event.target.value },
                })
              }
              aria-label="Text color"
            />
          ) : null}
        </span>
      </div>

      <label className="fe-field">
        <span className="fe-field-label">Anchor id</span>
        <input
          value={anchorDraft}
          onChange={(event) => commitAnchor(event.target.value)}
          placeholder="e.g. key-takeaways"
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

  const lesson = course?.lessons.find((item) => item.id === selectedLessonId);
  const block =
    lesson?.type === "blocks"
      ? lesson.blocks.find((item) => item.id === selectedBlockId)
      : undefined;

  if (!lesson || !block) return null;

  const entry = getRegistryEntry(block.family);

  return (
    <aside className="fe-settings" aria-label="Block settings">
      <div className="fe-settings-header">
        <span>
          {entry.palette.label}
          <span className="fe-muted"> / {block.variant}</span>
        </span>
        <button
          type="button"
          className="fe-icon-btn"
          onClick={() => selectBlock(null)}
          title="Close settings"
          aria-label="Close settings"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <EnvelopeSettings key={`env-${block.id}`} lessonId={lesson.id} block={block} />
      <section className="fe-settings-section">
        <h3>Content</h3>
        <PayloadEditor key={`payload-${block.id}-${block.variant}`} lessonId={lesson.id} block={block} />
      </section>
    </aside>
  );
}

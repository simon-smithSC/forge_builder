// Right edit drawer (Rise parity P3-lite): titled "Edit {variant}", content
// and structure editors first, the envelope settings demoted into a
// collapsed Format section at the bottom (also the target of the rail's
// Style/Format control).
import type { ReactElement } from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { Button, IconButton, Input, Radio } from "@forge/ui";
import { getRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import { selectBlock, setBlockSettings } from "../state/actions.js";
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

      <div className="fe-field">
        <span className="fe-field-label">Text color</span>
        <span className="fe-field-row">
          <Radio
            className="fe-radio"
            label="Auto"
            name={`fe-tcm-${block.id}`}
            checked={block.settings.textColorMode === "auto"}
            onChange={() =>
              setBlockSettings(lessonId, block.id, { textColorMode: "auto" })
            }
          />
          <Radio
            className="fe-radio"
            label="Explicit"
            name={`fe-tcm-${block.id}`}
            checked={block.settings.textColorMode !== "auto"}
            onChange={() =>
              setBlockSettings(lessonId, block.id, {
                textColorMode: { mode: "explicit", color: explicitColor },
              })
            }
          />
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
        <span>{editTitle(entry.palette.label, block.variant)}</span>
        <IconButton
          label="Close settings"
          icon={<X size={16} aria-hidden />}
          onClick={() => selectBlock(null)}
        />
      </div>
      <section className="fe-settings-section">
        <h3>Content</h3>
        <PayloadEditor key={`payload-${block.id}-${block.variant}`} lessonId={lesson.id} block={block} />
      </section>
      <details className="fe-settings-format">
        <summary>Format</summary>
        <EnvelopeSettings key={`env-${block.id}`} lessonId={lesson.id} block={block} />
      </details>
    </aside>
  );
}

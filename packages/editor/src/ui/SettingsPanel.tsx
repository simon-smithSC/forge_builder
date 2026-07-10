// Right edit drawer (Rise parity P3-lite): titled "Edit {variant}", content
// and structure editors first, the envelope settings demoted into a
// collapsed Format section at the bottom (also the target of the rail's
// Style/Format control).
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  InspectorRail,
  InspectorSection,
  PropertyRow,
} from "@forge/ui";
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
  readOnly,
}: {
  lessonId: string;
  block: Block;
  readOnly: boolean;
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
    <InspectorSection title="Style" description="Block envelope and spacing.">
      <PropertyRow
        label={`Padding top (${block.settings.paddingTop})`}
        control={
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={block.settings.paddingTop}
          disabled={readOnly}
          onChange={(event) =>
            setBlockSettings(lessonId, block.id, {
              paddingTop: Number(event.target.value),
            })
          }
        />
        }
      />

      <PropertyRow
        label={`Padding bottom (${block.settings.paddingBottom})`}
        control={
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={block.settings.paddingBottom}
          disabled={readOnly}
          onChange={(event) =>
            setBlockSettings(lessonId, block.id, {
              paddingBottom: Number(event.target.value),
            })
          }
        />
        }
      />

      <PropertyRow
        label="Background color"
        control={
          <span className="fe-field-row">
          <input
            type="color"
            value={block.settings.backgroundColor ?? "#ffffff"}
            disabled={readOnly}
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
            disabled={readOnly || block.settings.backgroundColor === undefined}
          >
            Clear
          </Button>
        </span>
        }
      />

      {/* textColorMode UI removed (V2): per-selection color now lives in the
          rich text toolbar. The schema field and renderer support stay so
          existing courses remain valid. */}
      <PropertyRow
        label="Anchor id"
        description="Used for deep links and navigation targets."
        control={
        <span className="fe-settings-field-stack">
        <Input
          value={anchorDraft}
          onChange={(event) => commitAnchor(event.target.value)}
          placeholder="e.g. key-takeaways"
          invalid={anchorError !== null}
          disabled={readOnly}
        />
        {anchorError ? <span className="fe-field-error">{anchorError}</span> : null}
        </span>
        }
      />
    </InspectorSection>
  );
}

export function SettingsPanel(): ReactElement | null {
  const course = useStore((state) => state.course);
  const selectedLessonId = useStore((state) => state.selectedLessonId);
  const selectedBlockId = useStore((state) => state.selectedBlockId);
  const selectedLock = useStore((state) =>
    state.selectedLessonId ? state.lessonLocks[state.selectedLessonId] : undefined,
  );

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
  const readOnly = selectedLock?.status !== "owned";

  return (
    // Closing keeps the block selected (V1.1): X and Escape only dismiss
    // the tray; the canvas ring + rail stay.
    <InspectorRail
      className="fe-settings"
      title={editTitle(entry.palette.label, block.variant)}
      meta={readOnly ? "Read-only until you hold the lesson lock" : entry.palette.label}
      actions={
        <IconButton
          label="Close settings"
          icon={<X size={16} aria-hidden />}
          onClick={() => closeBlockSettings()}
        />
      }
      aria-label="Block settings"
      onKeyDown={(event) => {
        if (event.key === "Escape") closeBlockSettings();
      }}
    >
      <div className={readOnly ? "fe-settings-readonly" : undefined}>
        <InspectorSection title="Content">
          <PayloadEditor
            key={`payload-${block.id}-${block.variant}`}
            lessonId={lessonId}
            block={block}
          />
        </InspectorSection>
      </div>
      <InspectorSection
        title="Behavior"
        description="Interaction rules are configured inside block content."
      >
        <PropertyRow label="Completion" control={<span>Block default</span>} />
      </InspectorSection>
      <EnvelopeSettings
        key={`env-${block.id}`}
        lessonId={lessonId}
        block={block}
        readOnly={readOnly}
      />
      <InspectorSection title="Accessibility">
        <PropertyRow
          label="Alt and captions"
          description="Media fields prompt for canonical alt text and captions where supported."
          control={<span>Per field</span>}
        />
      </InspectorSection>
      <InspectorSection title="Metadata">
        <PropertyRow label="Block id" control={<code>{block.id}</code>} />
      </InspectorSection>
    </InspectorRail>
  );
}

// Editor affordances wrapping the shared BlockView: selection ring, hover
// toolbar (drag grip, move, duplicate, delete, variant switcher). The block
// itself is rendered ONLY by @forge/blocks. Drag reorder via dnd-kit
// useSortable: the frame is the sortable node, but the drag listeners live
// ONLY on the grip button so everything else stays clickable.
import type { CSSProperties, ReactElement } from "react";
import { ChevronDown, ChevronUp, Copy, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { BlockView, getRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import {
  deleteBlock,
  duplicateBlock,
  moveBlock,
  selectBlock,
  setBlockVariant,
} from "../state/actions.js";

export interface BlockEditFrameProps {
  block: Block;
  lessonId: string;
  index: number;
  count: number;
  selected: boolean;
}

export function BlockEditFrame({
  block,
  lessonId,
  index,
  count,
  selected,
}: BlockEditFrameProps): ReactElement {
  const entry = getRegistryEntry(block.family);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  // @dnd-kit/utilities is not directly importable in this workspace layout,
  // so the transform string is computed by hand (translation only).
  const style: CSSProperties = {};
  if (transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }
  if (transition) style.transition = transition;

  const classes = [
    "fe-block-frame",
    selected ? "fe-block-frame-selected" : "",
    isDragging ? "fe-dnd-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classes}
      onClick={(event) => {
        event.stopPropagation();
        selectBlock(block.id);
      }}
    >
      <div className="fe-block-toolbar" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm fe-drag-grip"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} aria-hidden />
        </button>
        <span className="fe-block-toolbar-label">{entry.palette.label}</span>
        <select
          className="fe-variant-select"
          value={block.variant}
          onChange={(event) => setBlockVariant(lessonId, block.id, event.target.value)}
          aria-label={`${entry.palette.label} variant`}
        >
          {entry.variants.map((variant) => (
            <option key={variant} value={variant}>
              {variant}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => moveBlock(lessonId, block.id, "up")}
          disabled={index === 0}
          title="Move up"
          aria-label="Move block up"
        >
          <ChevronUp size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => moveBlock(lessonId, block.id, "down")}
          disabled={index === count - 1}
          title="Move down"
          aria-label="Move block down"
        >
          <ChevronDown size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => duplicateBlock(lessonId, block.id)}
          title="Duplicate"
          aria-label="Duplicate block"
        >
          <Copy size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm fe-icon-btn-danger"
          onClick={() => deleteBlock(lessonId, block.id)}
          title="Delete"
          aria-label="Delete block"
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
      <BlockView block={block} />
    </div>
  );
}

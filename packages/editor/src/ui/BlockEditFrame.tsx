// Editor affordances wrapping the shared BlockView. Rise parity P2: instead
// of a horizontal hover toolbar, each block carries a compact vertical rail
// at its left edge (teardown "Contextual Block Rail" / "Global Block
// Behaviour"): block-type chip (opens a variant menu), Style/Format (opens
// the right drawer), drag grip, move up/down (hidden at the ends, not
// disabled), duplicate, delete. The block itself is rendered ONLY by
// @forge/blocks. Drag reorder via dnd-kit useSortable: the frame is the
// sortable node, but the drag listeners live ONLY on the grip button so
// everything else stays clickable.
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { BlockView, getRegistryEntry } from "@forge/blocks";
import type { BlockRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import {
  deleteBlock,
  duplicateBlock,
  moveBlock,
  selectBlock,
  setBlockVariant,
} from "../state/actions.js";
import { blockIcon } from "./blockIcons.js";
import { variantLabel } from "./variantLabels.js";

export interface BlockEditFrameProps {
  block: Block;
  lessonId: string;
  index: number;
  count: number;
  selected: boolean;
}

/** Variant menu popover opened from the block-type chip. */
function VariantMenu({
  entry,
  block,
  lessonId,
  onClose,
}: {
  entry: BlockRegistryEntry;
  block: Block;
  lessonId: string;
  onClose: () => void;
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fe-variant-menu"
      role="menu"
      aria-label={`${entry.palette.label} style`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <span className="fe-variant-menu-title">{entry.palette.label} style</span>
      {entry.variants.map((variant) => {
        const active = variant === block.variant;
        return (
          <button
            key={variant}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            className={
              active ? "fe-variant-option fe-variant-option-active" : "fe-variant-option"
            }
            onClick={() => {
              if (!active) setBlockVariant(lessonId, block.id, variant);
              onClose();
            }}
          >
            <span className="fe-variant-option-check" aria-hidden>
              {active ? <Check size={12} /> : null}
            </span>
            {variantLabel(entry.palette.label, variant)}
          </button>
        );
      })}
    </div>
  );
}

export function BlockEditFrame({
  block,
  lessonId,
  index,
  count,
  selected,
}: BlockEditFrameProps): ReactElement {
  const entry = getRegistryEntry(block.family);
  const [variantMenuOpen, setVariantMenuOpen] = useState(false);
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

  const FamilyIcon = blockIcon(entry.palette.icon);

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
      <div className="fe-block-rail" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="fe-rail-chip"
          onClick={() => setVariantMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={variantMenuOpen}
          title={`${variantLabel(entry.palette.label, block.variant)}: change style`}
        >
          <FamilyIcon size={14} aria-hidden />
          <span className="fe-rail-chip-label">{entry.palette.label}</span>
        </button>
        {variantMenuOpen ? (
          <VariantMenu
            entry={entry}
            block={block}
            lessonId={lessonId}
            onClose={() => setVariantMenuOpen(false)}
          />
        ) : null}
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => selectBlock(block.id)}
          title="Style and format"
          aria-label="Open style and format settings"
        >
          <SlidersHorizontal size={14} aria-hidden />
        </button>
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
        {index > 0 ? (
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            onClick={() => moveBlock(lessonId, block.id, "up")}
            title="Move up"
            aria-label="Move block up"
          >
            <ChevronUp size={14} aria-hidden />
          </button>
        ) : null}
        {index < count - 1 ? (
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            onClick={() => moveBlock(lessonId, block.id, "down")}
            title="Move down"
            aria-label="Move block down"
          >
            <ChevronDown size={14} aria-hidden />
          </button>
        ) : null}
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

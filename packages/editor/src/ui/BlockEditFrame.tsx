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
import { Chip, IconButton, Presence, Tooltip } from "@forge/ui";
import type { PresenceChildProps } from "@forge/ui";
import { BlockView, getRegistryEntry } from "@forge/blocks";
import type { BlockRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import {
  closeBlockSettings,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  openBlockSettings,
  selectBlock,
  setBlockVariant,
} from "../state/actions.js";
import { useStore } from "../state/store.js";
import { blockIcon } from "./blockIcons.js";
import { variantLabel } from "./variantLabels.js";

export interface BlockEditFrameProps {
  block: Block;
  lessonId: string;
  index: number;
  count: number;
  selected: boolean;
  readOnly?: boolean;
}

/** Variant menu popover opened from the block-type chip. Presence (motion M5)
 * keeps it mounted through the [data-state="closed"] exit transition. */
function VariantMenu({
  entry,
  block,
  lessonId,
  onClose,
  presence,
}: {
  entry: BlockRegistryEntry;
  block: Block;
  lessonId: string;
  onClose: () => void;
  presence: PresenceChildProps;
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const closing = presence["data-state"] === "closed";

  useEffect(() => {
    // Dismiss listeners are gated off while closing so a fading menu cannot
    // keep swallowing outside pointer-downs (CSS also drops pointer-events).
    if (closing) return;
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!ref.current || ref.current.contains(target)) return;
      // The rail chip that opened this menu is a TOGGLE: closing here on
      // mousedown would race its click handler into reopening the menu.
      // Leave that close to the chip's own onClick.
      const rail = ref.current.closest(".fe-block-rail");
      const chip =
        target instanceof Element ? target.closest(".fe-rail-chip") : null;
      if (chip !== null && rail !== null && rail.contains(chip)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose, closing]);

  return (
    <div
      ref={(node) => {
        ref.current = node;
        presence.ref(node);
      }}
      data-state={presence["data-state"]}
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
  readOnly = false,
}: BlockEditFrameProps): ReactElement {
  const entry = getRegistryEntry(block.family);
  const [variantMenuOpen, setVariantMenuOpen] = useState(false);
  // Toggle support for the rail's Edit settings button: the tray is open FOR
  // THIS BLOCK only when it is both selected and settingsOpen.
  const settingsOpen = useStore((state) => state.settingsOpen);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, disabled: readOnly });

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
        <Chip
          className="fe-rail-chip"
          onClick={() => {
            if (!readOnly) setVariantMenuOpen((open) => !open);
          }}
          aria-haspopup="menu"
          aria-expanded={readOnly ? undefined : variantMenuOpen}
          aria-disabled={readOnly}
          title={`${variantLabel(entry.palette.label, block.variant)}: change style`}
        >
          <FamilyIcon size={14} aria-hidden />
          <span className="fe-rail-chip-label">{entry.palette.label}</span>
        </Chip>
        <Presence open={variantMenuOpen}>
          {(presence) => (
            <VariantMenu
              entry={entry}
              block={block}
              lessonId={lessonId}
              onClose={() => setVariantMenuOpen(false)}
              presence={presence}
            />
          )}
        </Presence>
        <Tooltip content="Edit settings" placement="bottom">
          <IconButton
            size="sm"
            label="Edit settings"
            title="Edit settings"
            icon={<SlidersHorizontal size={14} aria-hidden />}
            disabled={readOnly}
            onClick={() =>
              selected && settingsOpen
                ? closeBlockSettings()
                : openBlockSettings(block.id)
            }
          />
        </Tooltip>
        <IconButton
          className="fe-drag-grip"
          size="sm"
          label="Drag to reorder"
          icon={<GripVertical size={14} aria-hidden />}
          disabled={readOnly}
          {...attributes}
          {...(readOnly ? {} : listeners)}
        />
        {index > 0 ? (
          <Tooltip content="Move up" placement="bottom">
            <IconButton
              size="sm"
              label="Move block up"
              title="Move up"
              icon={<ChevronUp size={14} aria-hidden />}
              disabled={readOnly}
              onClick={() => moveBlock(lessonId, block.id, "up")}
            />
          </Tooltip>
        ) : null}
        {index < count - 1 ? (
          <Tooltip content="Move down" placement="bottom">
            <IconButton
              size="sm"
              label="Move block down"
              title="Move down"
              icon={<ChevronDown size={14} aria-hidden />}
              disabled={readOnly}
              onClick={() => moveBlock(lessonId, block.id, "down")}
            />
          </Tooltip>
        ) : null}
        <Tooltip content="Duplicate" placement="bottom">
          <IconButton
            size="sm"
            label="Duplicate block"
            title="Duplicate"
            icon={<Copy size={14} aria-hidden />}
            disabled={readOnly}
            onClick={() => duplicateBlock(lessonId, block.id)}
          />
        </Tooltip>
        <Tooltip content="Delete" placement="bottom">
          <IconButton
            size="sm"
            variant="danger"
            label="Delete block"
            title="Delete"
            icon={<Trash2 size={14} aria-hidden />}
            disabled={readOnly}
            onClick={() => deleteBlock(lessonId, block.id)}
          />
        </Tooltip>
      </div>
      <BlockView block={block} />
    </div>
  );
}

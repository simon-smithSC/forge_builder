// Registry entry + dispatcher for the interactive-fullscreen family.
// The per-variant views live in ifsProcess.tsx, ifsGraphicTimeline.tsx, and
// ifsSorting.tsx; this file stays the family's single Renderer object.
import type { ReactElement } from "react";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";
import { ProcessView } from "./ifsProcess.js";
import type { ProcessBlock } from "./ifsProcess.js";
import { LabeledGraphicView, TimelineView } from "./ifsGraphicTimeline.js";
import type { LabeledGraphicBlock, TimelineBlock } from "./ifsGraphicTimeline.js";
import { SortingView } from "./ifsSorting.js";
import type { SortingBlock } from "./ifsSorting.js";

type InteractiveFullscreenBlock =
  | ProcessBlock
  | LabeledGraphicBlock
  | TimelineBlock
  | SortingBlock;

function InteractiveFullscreenRendererImpl({
  block,
}: BlockRendererProps): ReactElement {
  const b = block as InteractiveFullscreenBlock;
  switch (b.variant) {
    case "process":
      return <ProcessView block={b} />;
    case "labeled graphic":
      return <LabeledGraphicView block={b} />;
    case "timeline":
      return <TimelineView block={b} />;
    case "sorting":
      return <SortingView block={b} />;
  }
}

const defaults: Record<string, () => unknown> = {
  process: () => ({
    intro: "<p>This process walks through the key steps.</p>",
    steps: [
      { id: "step-1", title: "Step 1", html: "<p>Do the first thing.</p>" },
      { id: "step-2", title: "Step 2", html: "<p>Do the second thing.</p>" },
    ],
  }),
  "labeled graphic": () => ({
    image: { mediaId: "media-placeholder", alt: "Labeled graphic" },
    markers: [
      { id: "marker-1", x: 30, y: 40, title: "First marker", html: "<p>Detail for this spot.</p>" },
    ],
  }),
  timeline: () => ({
    events: [
      { id: "event-1", date: "2020", title: "First milestone", html: "<p>What happened first.</p>" },
      { id: "event-2", date: "2023", title: "Second milestone", html: "<p>What happened next.</p>" },
    ],
  }),
  sorting: () => ({
    piles: [
      { id: "pile-1", label: "Pile A" },
      { id: "pile-2", label: "Pile B" },
    ],
    items: [
      { id: "item-1", label: "First item", correctPileId: "pile-1" },
      { id: "item-2", label: "Second item", correctPileId: "pile-2" },
    ],
  }),
};

export const interactiveFullscreenEntry: BlockRegistryEntry = {
  family: "interactive-fullscreen",
  variants: variantsOf("interactive-fullscreen"),
  palette: {
    label: "Interactive (fullscreen)",
    group: "interactive",
    description: "Processes, labeled graphics, timelines, and sorting activities.",
    icon: "expand",
  },
  contentWidth: { "labeled graphic": "wide" },
  createDefaultPayload: (variant) => {
    const factory = defaults[variant];
    if (!factory) {
      throw new Error(`Unknown interactive-fullscreen variant "${variant}".`);
    }
    return factory();
  },
  validatePayload: (payload, variant) =>
    validateWithSchema("interactive-fullscreen", variant, payload),
  Renderer: InteractiveFullscreenRendererImpl,
};

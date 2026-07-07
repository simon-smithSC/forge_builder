import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ProcessBlock = BlockFor<"interactive-fullscreen", "process">;
type LabeledGraphicBlock = BlockFor<"interactive-fullscreen", "labeled graphic">;
type TimelineBlock = BlockFor<"interactive-fullscreen", "timeline">;
type SortingBlock = BlockFor<"interactive-fullscreen", "sorting">;
type InteractiveFullscreenBlock =
  | ProcessBlock
  | LabeledGraphicBlock
  | TimelineBlock
  | SortingBlock;

interface ProcessPage {
  key: string;
  title: string;
  html: string;
  imageMediaId?: string | undefined;
}

function ProcessView({ block }: { block: ProcessBlock }): ReactElement {
  const { mode, events, resolveMediaUrl } = useRenderContext();
  const p = block.payload;
  const pages: ProcessPage[] = [
    { key: "intro", title: "Introduction", html: p.intro },
    ...p.steps.map((step) => ({
      key: step.id,
      title: step.title,
      html: step.html,
      imageMediaId: step.imageMediaId,
    })),
  ];
  if (p.summary) pages.push({ key: "summary", title: "Summary", html: p.summary });

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const safeIndex = Math.min(index, pages.length - 1);
  const page = pages[safeIndex];

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, next));
    setIndex(clamped);
    if (mode === "player") {
      events.onInteracted?.(block.id, { pageIndex: clamped });
      if (clamped === pages.length - 1 && !completed) {
        setCompleted(true);
        events.onCompleted?.(block.id);
      }
    }
  };

  const imageUrl = page?.imageMediaId ? resolveMediaUrl(page.imageMediaId) : undefined;

  return (
    <div className="fb-interactive-fullscreen fb-interactive-fullscreen-process">
      <p className="fb-interactive-fullscreen-progress">
        {safeIndex + 1} / {pages.length}
      </p>
      {page ? (
        <div className="fb-interactive-fullscreen-page">
          <h3 className="fb-interactive-fullscreen-page-title">{page.title}</h3>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="fb-interactive-fullscreen-page-image" />
          ) : null}
          <Html fragment={page.html} />
        </div>
      ) : null}
      <div className="fb-interactive-fullscreen-nav">
        <button
          type="button"
          className="fb-interactive-fullscreen-nav-button"
          disabled={safeIndex === 0}
          onClick={() => go(safeIndex - 1)}
        >
          &#8592; Previous
        </button>
        <button
          type="button"
          className="fb-interactive-fullscreen-nav-button"
          disabled={safeIndex === pages.length - 1}
          onClick={() => go(safeIndex + 1)}
        >
          Next &#8594;
        </button>
      </div>
    </div>
  );
}

function LabeledGraphicView({ block }: { block: LabeledGraphicBlock }): ReactElement {
  const { mode, events, resolveMediaUrl } = useRenderContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const p = block.payload;
  const url = resolveMediaUrl(p.image.mediaId);
  const active = p.markers.find((marker) => marker.id === activeId);

  return (
    <div className="fb-interactive-fullscreen fb-interactive-fullscreen-graphic">
      {url ? (
        <img src={url} alt={p.image.alt} className="fb-interactive-fullscreen-graphic-image" />
      ) : (
        <MediaPlaceholder label={p.image.alt} />
      )}
      {p.markers.map((marker, markerIndex) => (
        <button
          key={marker.id}
          type="button"
          className="fb-interactive-fullscreen-marker"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          aria-expanded={activeId === marker.id}
          aria-label={marker.title}
          onClick={() => {
            const next = activeId === marker.id ? null : marker.id;
            setActiveId(next);
            if (mode === "player" && next) {
              events.onInteracted?.(block.id, { markerId: marker.id });
            }
          }}
        >
          {markerIndex + 1}
        </button>
      ))}
      {active ? (
        <div
          className="fb-interactive-fullscreen-popover"
          role="dialog"
          aria-label={active.title}
          style={{ left: `${active.x}%`, top: `${active.y}%` }}
        >
          <h4 className="fb-interactive-fullscreen-popover-title">{active.title}</h4>
          <Html fragment={active.html} />
          <button
            type="button"
            className="fb-interactive-fullscreen-popover-close"
            onClick={() => setActiveId(null)}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TimelineView({ block }: { block: TimelineBlock }): ReactElement {
  const { mode, events, resolveMediaUrl } = useRenderContext();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const entries = block.payload.events;

  const toggle = (entryId: string) => {
    const isOpen = expanded.has(entryId);
    const next = new Set(expanded);
    if (isOpen) next.delete(entryId);
    else next.add(entryId);
    setExpanded(next);
    if (!isOpen && mode === "player") {
      events.onInteracted?.(block.id, { eventId: entryId });
    }
  };

  return (
    <ol className="fb-interactive-fullscreen fb-interactive-fullscreen-timeline">
      {entries.map((entry) => {
        const isOpen = expanded.has(entry.id);
        const mediaUrl = entry.mediaId ? resolveMediaUrl(entry.mediaId) : undefined;
        return (
          <li key={entry.id} className="fb-interactive-fullscreen-timeline-event">
            <span className="fb-interactive-fullscreen-timeline-date">{entry.date}</span>
            <button
              type="button"
              className="fb-interactive-fullscreen-timeline-trigger"
              aria-expanded={isOpen}
              onClick={() => toggle(entry.id)}
            >
              {entry.title}
            </button>
            {isOpen ? (
              <div className="fb-interactive-fullscreen-timeline-body">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt=""
                    className="fb-interactive-fullscreen-timeline-image"
                  />
                ) : null}
                <Html fragment={entry.html} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SortingView({ block }: { block: SortingBlock }): ReactElement {
  const { mode, events, labels } = useRenderContext();
  const p = block.payload;
  const [assignments, setAssignments] = useState<Readonly<Record<string, string>>>({});
  const [results, setResults] = useState<Readonly<Record<string, boolean>> | null>(null);
  const [reported, setReported] = useState(false);

  const allAssigned = p.items.every((item) => Boolean(assignments[item.id]));

  const assign = (itemId: string, pileId: string) => {
    if (results) return;
    setAssignments({ ...assignments, [itemId]: pileId });
    if (mode === "player") {
      events.onInteracted?.(block.id, { itemId, pileId });
    }
  };

  const check = () => {
    const next: Record<string, boolean> = {};
    for (const item of p.items) {
      next[item.id] = assignments[item.id] === item.correctPileId;
    }
    setResults(next);
    const correct = p.items.every((item) => next[item.id] === true);
    if (mode === "player" && !reported) {
      setReported(true);
      events.onCompleted?.(block.id, { correct });
    }
  };

  const reset = () => {
    setAssignments({});
    setResults(null);
  };

  return (
    <div className="fb-interactive-fullscreen fb-interactive-fullscreen-sorting">
      {p.items.map((item) => {
        const result = results ? results[item.id] : undefined;
        return (
          <div key={item.id} className="fb-interactive-fullscreen-sorting-item">
            <span className="fb-interactive-fullscreen-sorting-label">{item.label}</span>
            <div
              className="fb-interactive-fullscreen-sorting-piles"
              role="group"
              aria-label={item.label}
            >
              {p.piles.map((pile) => (
                <button
                  key={pile.id}
                  type="button"
                  className={`fb-interactive-fullscreen-sorting-pile${
                    assignments[item.id] === pile.id
                      ? " fb-interactive-fullscreen-sorting-pile-selected"
                      : ""
                  }`}
                  aria-pressed={assignments[item.id] === pile.id}
                  disabled={results !== null}
                  onClick={() => assign(item.id, pile.id)}
                >
                  {pile.label}
                </button>
              ))}
            </div>
            {results ? (
              <span
                className={`fb-interactive-fullscreen-sorting-result ${
                  result
                    ? "fb-interactive-fullscreen-sorting-correct"
                    : "fb-interactive-fullscreen-sorting-incorrect"
                }`}
              >
                {result ? labels.correct : labels.incorrect}
                {!result && item.feedback ? ` — ${item.feedback}` : ""}
              </span>
            ) : null}
          </div>
        );
      })}
      {results ? (
        <button
          type="button"
          className="fb-interactive-fullscreen-sorting-check"
          onClick={reset}
        >
          {labels.retry}
        </button>
      ) : (
        <button
          type="button"
          className="fb-interactive-fullscreen-sorting-check"
          disabled={!allAssigned}
          onClick={check}
        >
          Check answers
        </button>
      )}
    </div>
  );
}

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

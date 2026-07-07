// Labeled graphic + timeline views for interactive-fullscreen, rebuilt to
// the Rise treatments (teardown lines 712-749 and 784-815): pulsing accent
// marker dots with viewed state and a popover card with previous/next/close;
// a vertical accent timeline with node dots, small-caps date labels, bold
// titles, and per-event reveal. Both report onCompleted once every item has
// been viewed (interactive-fullscreen is interaction-gated in the player).
import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";

export type LabeledGraphicBlock = BlockFor<"interactive-fullscreen", "labeled graphic">;
export type TimelineBlock = BlockFor<"interactive-fullscreen", "timeline">;

export function LabeledGraphicView({
  block,
}: {
  block: LabeledGraphicBlock;
}): ReactElement {
  const { mode, events, resolveMediaUrl } = useRenderContext();
  const p = block.payload;
  const markers = p.markers;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewed, setViewed] = useState<ReadonlySet<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const url = resolveMediaUrl(p.image.mediaId);
  const active = activeIndex !== null ? markers[activeIndex] : undefined;

  const open = (nextIndex: number | null) => {
    setActiveIndex(nextIndex);
    if (nextIndex === null) return;
    const marker = markers[nextIndex];
    if (!marker) return;
    const nextViewed = new Set(viewed);
    nextViewed.add(marker.id);
    setViewed(nextViewed);
    if (mode === "player") {
      events.onInteracted?.(block.id, { markerId: marker.id });
      if (nextViewed.size === markers.length && !completed) {
        setCompleted(true);
        events.onCompleted?.(block.id);
      }
    }
  };

  return (
    <div className="fb-labeled-graphic">
      {url ? (
        <img src={url} alt={p.image.alt} className="fb-labeled-graphic-image" />
      ) : (
        <MediaPlaceholder label={p.image.alt} />
      )}
      {markers.map((marker, markerIndex) => {
        const isActive = activeIndex === markerIndex;
        const isViewed = viewed.has(marker.id);
        return (
          <button
            key={marker.id}
            type="button"
            className={`fb-labeled-graphic-marker${
              isViewed ? " fb-labeled-graphic-marker-viewed" : ""
            }${isActive ? " fb-labeled-graphic-marker-active" : ""}`}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            aria-expanded={isActive}
            aria-label={`Marker, ${marker.title}, ${isViewed ? "Viewed" : "Not viewed"}`}
            onClick={() => open(isActive ? null : markerIndex)}
          >
            <span aria-hidden="true">{isViewed && !isActive ? "✓" : "+"}</span>
          </button>
        );
      })}
      {active && activeIndex !== null ? (
        <div
          className="fb-labeled-graphic-popover"
          role="dialog"
          aria-label={active.title}
          style={{ left: `${active.x}%`, top: `${active.y}%` }}
        >
          <button
            type="button"
            className="fb-labeled-graphic-popover-close"
            aria-label="Close"
            onClick={() => open(null)}
          >
            <span aria-hidden="true">&#215;</span>
          </button>
          <h4 className="fb-labeled-graphic-popover-title">{active.title}</h4>
          <Html fragment={active.html} className="fb-labeled-graphic-popover-body" />
          {markers.length > 1 ? (
            <div className="fb-labeled-graphic-popover-nav">
              <button
                type="button"
                className="fb-labeled-graphic-popover-step"
                onClick={() =>
                  open((activeIndex - 1 + markers.length) % markers.length)
                }
              >
                Previous
              </button>
              <span className="fb-labeled-graphic-popover-count">
                {activeIndex + 1} of {markers.length}
              </span>
              <button
                type="button"
                className="fb-labeled-graphic-popover-step"
                onClick={() => open((activeIndex + 1) % markers.length)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TimelineView({ block }: { block: TimelineBlock }): ReactElement {
  const { mode, events, resolveMediaUrl } = useRenderContext();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const entries = block.payload.events;

  const toggle = (entryId: string) => {
    const isOpen = expanded.has(entryId);
    const next = new Set(expanded);
    if (isOpen) next.delete(entryId);
    else next.add(entryId);
    setExpanded(next);
    if (!isOpen && mode === "player") {
      const nextOpened = new Set(opened);
      nextOpened.add(entryId);
      setOpened(nextOpened);
      events.onInteracted?.(block.id, { eventId: entryId });
      if (nextOpened.size === entries.length && !completed) {
        setCompleted(true);
        events.onCompleted?.(block.id);
      }
    }
  };

  return (
    <ol className="fb-timeline">
      {entries.map((entry) => {
        const isOpen = expanded.has(entry.id);
        const mediaUrl = entry.mediaId ? resolveMediaUrl(entry.mediaId) : undefined;
        return (
          <li
            key={entry.id}
            className={`fb-timeline-event${isOpen ? " fb-timeline-event-open" : ""}`}
          >
            <span className="fb-timeline-node" aria-hidden="true" />
            <span className="fb-timeline-date">{entry.date}</span>
            <h3 className="fb-timeline-heading">
              <button
                type="button"
                className="fb-timeline-trigger"
                aria-expanded={isOpen}
                onClick={() => toggle(entry.id)}
              >
                {entry.title}
              </button>
            </h3>
            {isOpen ? (
              <div className="fb-timeline-body">
                {mediaUrl ? (
                  <img src={mediaUrl} alt="" className="fb-timeline-image" />
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

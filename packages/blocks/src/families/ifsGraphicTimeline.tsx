// Labeled graphic + timeline views for interactive-fullscreen, rebuilt to
// the Rise treatments (teardown lines 712-749 and 784-815): pulsing accent
// marker dots with viewed state and a popover card with previous/next/close;
// a vertical accent timeline with node dots, small-caps label eyebrows, bold
// titles, and per-event reveal. Both report onCompleted once every item has
// been viewed (interactive-fullscreen is interaction-gated in the player,
// except timelines whose details are visible from the start — see
// consumesByInteraction in @forge/player progress.ts).
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
  const entries = block.payload.events;
  const alwaysVisible = block.payload.detailsAlwaysVisible === true;
  // startExpanded seeds the initial per-viewer state only; after mount the
  // React state owns open/closed and items stay toggleable.
  const seedExpanded = (): ReadonlySet<string> =>
    new Set(entries.filter((entry) => entry.startExpanded).map((e) => e.id));
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(seedExpanded);
  // startExpanded items count as already opened for interaction completion.
  // When the block flag is set (or every item starts expanded) the player
  // consumes this block by scroll instead (progress.ts consumesByInteraction),
  // so the view never needs to report completion in those shapes.
  const [opened, setOpened] = useState<ReadonlySet<string>>(seedExpanded);
  const [completed, setCompleted] = useState(false);
  // Edit-mode canvas keeps this view MOUNTED while the drawer edits the
  // payload, so useState initializers never re-run. Re-seed when the set of
  // startExpanded ids changes (render-phase state adjustment) so the canvas
  // reflects the toggle immediately. In the player the payload never changes,
  // so per-viewer toggling is untouched.
  const seedKey = entries
    .filter((entry) => entry.startExpanded)
    .map((entry) => entry.id)
    .join("|");
  const [lastSeedKey, setLastSeedKey] = useState(seedKey);
  if (seedKey !== lastSeedKey) {
    setLastSeedKey(seedKey);
    setExpanded(seedExpanded());
    setOpened(seedExpanded());
  }

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
        const isOpen = alwaysVisible || expanded.has(entry.id);
        const mediaUrl = entry.mediaId ? resolveMediaUrl(entry.mediaId) : undefined;
        const body = (
          <div className="fb-timeline-body">
            {mediaUrl ? (
              <img src={mediaUrl} alt="" className="fb-timeline-image" />
            ) : null}
            <Html fragment={entry.html} />
          </div>
        );
        return (
          <li
            key={entry.id}
            className={`fb-timeline-event${isOpen ? " fb-timeline-event-open" : ""}`}
          >
            <span className="fb-timeline-node" aria-hidden="true" />
            {entry.label ? (
              <span className="fb-timeline-label">{entry.label}</span>
            ) : null}
            {alwaysVisible ? (
              <>
                <h3 className="fb-timeline-heading">{entry.title}</h3>
                {body}
              </>
            ) : (
              <>
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
                <div className="fb-timeline-body-clip">{body}</div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

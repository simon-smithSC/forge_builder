// Process view for the interactive-fullscreen family, rebuilt to the Rise
// treatment (teardown Interactive - Process, lines 615-648): "1 of 4" step
// counter, START on the intro, large accent-numbered step circles, a step
// card with left/right edge arrows, progress dots, START AGAIN at the end.
import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html } from "../html.js";

export type ProcessBlock = BlockFor<"interactive-fullscreen", "process">;

interface ProcessPage {
  key: string;
  kind: "intro" | "step" | "summary";
  title: string;
  html: string;
  stepNumber?: number | undefined;
  imageMediaId?: string | undefined;
}

export function ProcessView({ block }: { block: ProcessBlock }): ReactElement {
  const { mode, events, resolveMediaUrl } = useRenderContext();
  const p = block.payload;
  const pages: ProcessPage[] = [
    { key: "intro", kind: "intro", title: "Introduction", html: p.intro },
    ...p.steps.map((step, stepIndex) => ({
      key: step.id,
      kind: "step" as const,
      title: step.title,
      html: step.html,
      stepNumber: stepIndex + 1,
      imageMediaId: step.imageMediaId,
    })),
  ];
  if (p.summary) {
    pages.push({ key: "summary", kind: "summary", title: "Summary", html: p.summary });
  }

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const last = pages.length - 1;
  const safeIndex = Math.min(index, last);
  const page = pages[safeIndex];

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(last, next));
    setIndex(clamped);
    if (mode === "player") {
      events.onInteracted?.(block.id, { pageIndex: clamped });
      if (clamped === last && !completed) {
        setCompleted(true);
        events.onCompleted?.(block.id);
      }
    }
  };

  if (!page) return <div className="fb-process" />;
  const imageUrl = page.imageMediaId ? resolveMediaUrl(page.imageMediaId) : undefined;
  const atStart = safeIndex === 0;
  const atEnd = safeIndex === last;

  return (
    <div className="fb-process">
      <p className="fb-process-counter">
        <span className="fb-process-counter-count" aria-live="polite">
          {safeIndex + 1} of {pages.length}
        </span>
        <span className="fb-process-counter-title">{page.title}</span>
      </p>
      <div className="fb-process-frame">
        <button
          type="button"
          className="fb-process-arrow fb-process-arrow-prev"
          aria-label="Previous step"
          disabled={atStart}
          onClick={() => go(safeIndex - 1)}
        >
          <span aria-hidden="true">&#8592;</span>
        </button>
        <div className="fb-process-card">
          {page.kind === "step" ? (
            <span className="fb-process-step-circle" aria-hidden="true">
              {page.stepNumber}
            </span>
          ) : null}
          <h3 className="fb-process-title">{page.title}</h3>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="fb-process-image" />
          ) : null}
          <Html fragment={page.html} className="fb-process-body" />
          {page.kind === "intro" && pages.length > 1 ? (
            <button
              type="button"
              className="fb-process-start"
              onClick={() => go(1)}
            >
              Start
            </button>
          ) : null}
          {atEnd && page.kind !== "intro" ? (
            <button
              type="button"
              className="fb-process-start fb-process-restart"
              onClick={() => {
                setIndex(0);
                if (mode === "player") {
                  events.onInteracted?.(block.id, { pageIndex: 0 });
                }
              }}
            >
              Start again
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="fb-process-arrow fb-process-arrow-next"
          aria-label="Next step"
          disabled={atEnd}
          onClick={() => go(safeIndex + 1)}
        >
          <span aria-hidden="true">&#8594;</span>
        </button>
      </div>
      <div className="fb-process-dots">
        {pages.map((dotPage, dotIndex) => (
          <button
            key={dotPage.key}
            type="button"
            className={`fb-process-dot${
              dotIndex === safeIndex ? " fb-process-dot-active" : ""
            }`}
            aria-label={`Go to ${dotPage.title} (${dotIndex + 1} of ${pages.length})`}
            aria-current={dotIndex === safeIndex}
            onClick={() => go(dotIndex)}
          />
        ))}
      </div>
    </div>
  );
}

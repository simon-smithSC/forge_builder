// Sorting view for interactive-fullscreen, rebuilt to the Rise card-pile
// presentation (teardown Interactive - Sorting, lines 751-782): one current
// item at a time on a card pile ("Current item: ..."), category piles as
// targets, results with per-item feedback and a retry once all are sorted.
import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";

export type SortingBlock = BlockFor<"interactive-fullscreen", "sorting">;

export function SortingView({ block }: { block: SortingBlock }): ReactElement {
  const { mode, events, labels } = useRenderContext();
  const p = block.payload;
  const items = p.items;
  const [assignments, setAssignments] = useState<Readonly<Record<string, string>>>({});
  const [cursor, setCursor] = useState(0);
  const [results, setResults] = useState<Readonly<Record<string, boolean>> | null>(
    null,
  );
  const [reported, setReported] = useState(false);

  const current = cursor < items.length ? items[cursor] : undefined;
  const remaining = items.length - cursor;

  const assign = (pileId: string) => {
    if (!current || results) return;
    const nextAssignments = { ...assignments, [current.id]: pileId };
    setAssignments(nextAssignments);
    if (mode === "player") {
      events.onInteracted?.(block.id, { itemId: current.id, pileId });
    }
    const nextCursor = cursor + 1;
    setCursor(nextCursor);
    if (nextCursor >= items.length) {
      const next: Record<string, boolean> = {};
      for (const item of items) {
        next[item.id] = nextAssignments[item.id] === item.correctPileId;
      }
      setResults(next);
      const correct = items.every((item) => next[item.id] === true);
      if (mode === "player" && !reported) {
        setReported(true);
        events.onCompleted?.(block.id, { correct });
      }
    }
  };

  const reset = () => {
    setAssignments({});
    setResults(null);
    setCursor(0);
  };

  if (results) {
    const pileLabel = (pileId: string | undefined): string =>
      p.piles.find((pile) => pile.id === pileId)?.label ?? "";
    return (
      <div className="fb-sorting fb-sorting-results">
        <ul className="fb-sorting-result-list">
          {items.map((item) => {
            const ok = results[item.id] === true;
            return (
              <li
                key={item.id}
                className={`fb-sorting-result-row ${
                  ok ? "fb-sorting-result-correct" : "fb-sorting-result-incorrect"
                }`}
              >
                <span className="fb-sorting-result-mark" aria-hidden="true">
                  {ok ? "✓" : "✗"}
                </span>
                <span className="fb-sorting-result-text">
                  <strong>{item.label}</strong>{" "}
                  {ok ? labels.correct : labels.incorrect}
                  {": "}
                  {pileLabel(assignments[item.id])}
                  {!ok && item.feedback ? (
                    <span className="fb-sorting-result-feedback">
                      {" "}
                      {item.feedback}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        <button type="button" className="fb-sorting-retry" onClick={reset}>
          {labels.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="fb-sorting">
      <p className="fb-sorting-counter" aria-live="polite">
        {items.length - remaining + 1} of {items.length}
      </p>
      <div className="fb-sorting-pile-stack">
        {remaining > 2 ? <div className="fb-sorting-under fb-sorting-under-2" aria-hidden="true" /> : null}
        {remaining > 1 ? <div className="fb-sorting-under fb-sorting-under-1" aria-hidden="true" /> : null}
        {current ? (
          <div className="fb-sorting-card">
            <span className="fb-sorting-card-kicker">Current item</span>
            <span className="fb-sorting-card-label">{current.label}</span>
          </div>
        ) : null}
      </div>
      <div className="fb-sorting-piles" role="group" aria-label="Categories">
        {p.piles.map((pile) => (
          <button
            key={pile.id}
            type="button"
            className="fb-sorting-pile"
            disabled={!current}
            onClick={() => assign(pile.id)}
          >
            {pile.label}
          </button>
        ))}
      </div>
    </div>
  );
}

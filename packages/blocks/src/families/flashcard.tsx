// Flashcards rebuilt to the Rise treatment (teardown Flashcards, lines
// 817-856): fixed-ratio cards with a 3D flip transition (CSS handles
// prefers-reduced-motion), a "Click to flip" hint, grid and stack layouts
// with a "1 of 3" counter on the stack.
import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type FlashcardBlock =
  | BlockFor<"flashcard", "single card">
  | BlockFor<"flashcard", "grid">
  | BlockFor<"flashcard", "stack">;

type Flashcard = FlashcardBlock["payload"]["cards"][number];
type FlashcardSide = Flashcard["front"];

function SideContent({ side }: { side: FlashcardSide }): ReactElement {
  const { resolveMediaUrl } = useRenderContext();
  if (side.kind === "text") {
    return <Html fragment={side.html} className="fb-flashcard-side-text" />;
  }
  const url = resolveMediaUrl(side.mediaId);
  return url ? (
    <img src={url} alt={side.alt} className="fb-flashcard-side-image" />
  ) : (
    <MediaPlaceholder label={side.alt} />
  );
}

function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
}): ReactElement {
  return (
    <div className="fb-flashcard-scene">
      <div
        role="button"
        tabIndex={0}
        className={`fb-flashcard-card${flipped ? " fb-flashcard-card-flipped" : ""}`}
        aria-pressed={flipped}
        aria-label={flipped ? "Card back. Click to flip" : "Card front. Click to flip"}
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onFlip();
          }
        }}
      >
        <div className="fb-flashcard-face fb-flashcard-face-front">
          <SideContent side={card.front} />
        </div>
        <div className="fb-flashcard-face fb-flashcard-face-back">
          <SideContent side={card.back} />
        </div>
      </div>
    </div>
  );
}

function FlipHint(): ReactElement {
  return <p className="fb-flashcard-hint">Click to flip</p>;
}

function FlashcardRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as FlashcardBlock;
  const { mode, events } = useRenderContext();
  const cards = b.payload.cards;
  const visibleCards = b.variant === "single card" ? cards.slice(0, 1) : cards;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [completed, setCompleted] = useState(false);

  const flip = (cardId: string) => {
    const next = new Set(flipped);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    setFlipped(next);
    const nextSeen = new Set(seen);
    nextSeen.add(cardId);
    setSeen(nextSeen);
    if (mode === "player") {
      events.onInteracted?.(b.id, { cardId });
      if (!completed && visibleCards.every((card) => nextSeen.has(card.id))) {
        setCompleted(true);
        events.onCompleted?.(b.id);
      }
    }
  };

  if (b.variant === "grid") {
    return (
      <div className="fb-flashcard">
        <div className="fb-flashcard-grid">
          {visibleCards.map((card) => (
            <FlipCard
              key={card.id}
              card={card}
              flipped={flipped.has(card.id)}
              onFlip={() => flip(card.id)}
            />
          ))}
        </div>
        <FlipHint />
      </div>
    );
  }

  if (b.variant === "stack") {
    const safeIndex = Math.min(index, visibleCards.length - 1);
    const current = visibleCards[safeIndex];
    return (
      <div className="fb-flashcard fb-flashcard-stack">
        {current ? (
          <FlipCard
            card={current}
            flipped={flipped.has(current.id)}
            onFlip={() => flip(current.id)}
          />
        ) : null}
        <FlipHint />
        <div className="fb-flashcard-stack-controls">
          <button
            type="button"
            className="fb-flashcard-stack-button"
            aria-label="Previous card"
            disabled={safeIndex === 0}
            onClick={() => setIndex(safeIndex - 1)}
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <span className="fb-flashcard-stack-counter" aria-live="polite">
            {safeIndex + 1} of {visibleCards.length}
          </span>
          <button
            type="button"
            className="fb-flashcard-stack-button"
            aria-label="Next card"
            disabled={safeIndex === visibleCards.length - 1}
            onClick={() => setIndex(safeIndex + 1)}
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>
      </div>
    );
  }

  const single = visibleCards[0];
  return (
    <div className="fb-flashcard fb-flashcard-single">
      {single ? (
        <FlipCard
          card={single}
          flipped={flipped.has(single.id)}
          onFlip={() => flip(single.id)}
        />
      ) : null}
      <FlipHint />
    </div>
  );
}

export const flashcardEntry: BlockRegistryEntry = {
  family: "flashcard",
  variants: variantsOf("flashcard"),
  palette: {
    label: "Flashcards",
    group: "interactive",
    description: "Flip cards with text or image sides.",
    icon: "layers",
  },
  contentWidth: { grid: "wide" },
  createDefaultPayload: () => ({
    cards: [
      {
        id: "card-1",
        front: { kind: "text", html: "<p>Front of the card</p>" },
        back: { kind: "text", html: "<p>Back of the card</p>" },
      },
      {
        id: "card-2",
        front: { kind: "text", html: "<p>Another front</p>" },
        back: { kind: "text", html: "<p>Another back</p>" },
      },
    ],
  }),
  validatePayload: (payload, variant) =>
    validateWithSchema("flashcard", variant, payload),
  Renderer: FlashcardRendererImpl,
};

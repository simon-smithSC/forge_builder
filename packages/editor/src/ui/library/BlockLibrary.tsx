// P4 tier 2: the full block library. Rise-like side panel sliding in from
// the left edge: left category rail (teardown taxonomy mapped onto Forge
// families), right visual variant cards (icon, label, one-line description),
// search across all categories, a session-local "Recently used" section, and
// keyboard navigation (arrows through cards, Enter inserts). Inserting picks
// a SPECIFIC family+variant at the pending index and closes.
import type { KeyboardEvent, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { IconButton } from "@forge/ui";
import { insertBlockVariant } from "../../state/libraryActions.js";
import { blockIcon } from "../blockIcons.js";
import type { LibraryCard } from "./libraryData.js";
import {
  findCard,
  getRecentPicks,
  libraryCategories,
  recordRecentPick,
} from "./libraryData.js";
import "./library.css";

export interface BlockLibraryProps {
  lessonId: string;
  index: number;
  onClose: () => void;
}

function matches(card: LibraryCard, term: string): boolean {
  return (
    card.label.toLowerCase().includes(term) ||
    card.description.toLowerCase().includes(term) ||
    card.family.toLowerCase().includes(term) ||
    card.variant.toLowerCase().includes(term)
  );
}

function CardButton({
  card,
  onPick,
  onArrow,
}: {
  card: LibraryCard;
  onPick: (card: LibraryCard) => void;
  onArrow: (event: KeyboardEvent<HTMLButtonElement>) => void;
}): ReactElement {
  const Icon = blockIcon(card.icon);
  return (
    <button
      type="button"
      className="fe-lib-card"
      onClick={() => onPick(card)}
      onKeyDown={onArrow}
    >
      <span className="fe-lib-card-thumb" aria-hidden>
        <Icon size={20} />
      </span>
      <span className="fe-lib-card-text">
        <span className="fe-lib-card-label">{card.label}</span>
        <span className="fe-lib-card-desc">{card.description}</span>
      </span>
    </button>
  );
}

export function BlockLibrary({
  lessonId,
  index,
  onClose,
}: BlockLibraryProps): ReactElement {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sectionsRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  // Snapshot recents at open so the list is stable while the panel is up.
  const [recents] = useState(() =>
    getRecentPicks()
      .map((pick) => findCard(pick.family, pick.variant))
      .filter((card): card is LibraryCard => card !== undefined),
  );

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const term = query.trim().toLowerCase();
  const visibleCategories = useMemo(() => {
    if (term.length === 0) return libraryCategories;
    return libraryCategories
      .map((category) => ({
        ...category,
        cards: category.cards.filter((card) => matches(card, term)),
      }))
      .filter((category) => category.cards.length > 0);
  }, [term]);

  const pick = (card: LibraryCard): void => {
    insertBlockVariant(lessonId, card.family, card.variant, index);
    recordRecentPick(card.family, card.variant);
    onClose();
  };

  // Arrow keys walk every visible card in DOM order.
  const onArrow = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !backward) return;
    event.preventDefault();
    const root = sectionsRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLButtonElement>(".fe-lib-card"));
    const at = cards.findIndex((card) => card === event.currentTarget);
    const next = cards[(at + (forward ? 1 : -1) + cards.length) % cards.length];
    next?.focus();
  };

  const goToCategory = (id: string): void => {
    setActiveCategory(id);
    sectionsRef.current
      ?.querySelector(`[data-lib-section="${id}"]`)
      ?.scrollIntoView({ block: "start" });
  };

  return (
    <>
      <div className="fe-lib-scrim" onClick={onClose} />
      <div
        className="fe-lib-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Block library"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="fe-lib-header">
          <span className="fe-lib-search">
            <Search size={14} aria-hidden />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search all blocks"
              aria-label="Search all blocks"
            />
          </span>
          <IconButton
            label="Close block library"
            icon={<X size={16} aria-hidden />}
            onClick={onClose}
          />
        </div>
        <div className="fe-lib-body">
          <nav className="fe-lib-rail" aria-label="Block categories">
            {libraryCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={
                  category.id === activeCategory
                    ? "fe-lib-rail-item fe-lib-rail-item-active"
                    : "fe-lib-rail-item"
                }
                aria-current={category.id === activeCategory ? "true" : undefined}
                onClick={() => goToCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </nav>
          <div className="fe-lib-sections" ref={sectionsRef}>
            {recents.length > 0 && term.length === 0 ? (
              <section className="fe-lib-section">
                <h3>Recently used</h3>
                <div className="fe-lib-grid">
                  {recents.map((card) => (
                    <CardButton
                      key={`recent:${card.family}:${card.variant}`}
                      card={card}
                      onPick={pick}
                      onArrow={onArrow}
                    />
                  ))}
                </div>
              </section>
            ) : null}
            {visibleCategories.length === 0 ? (
              <p className="fe-lib-empty">No blocks match "{query}".</p>
            ) : null}
            {visibleCategories.map((category) => (
              <section
                key={category.id}
                className="fe-lib-section"
                data-lib-section={category.id}
              >
                <h3>{category.label}</h3>
                <div className="fe-lib-grid">
                  {category.cards.map((card) => (
                    <CardButton
                      key={`${card.family}:${card.variant}`}
                      card={card}
                      onPick={pick}
                      onArrow={onArrow}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

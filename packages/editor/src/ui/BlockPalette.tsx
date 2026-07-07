// Searchable block palette, grouped via blockRegistry palette metadata.
// // R2: thumbnails, recent/favorites, drag-from-palette (dnd-kit).
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { blockRegistry, paletteOrder } from "@forge/blocks";
import type { PaletteGroup } from "@forge/blocks";
import type { BlockFamily } from "@forge/schema";
import { insertBlock } from "../state/actions.js";

const GROUP_LABELS: Record<PaletteGroup, string> = {
  text: "Text",
  media: "Media",
  interactive: "Interactive",
  quiz: "Knowledge",
  data: "Data",
  structure: "Structure",
};

const GROUP_ORDER: readonly PaletteGroup[] = [
  "text",
  "media",
  "interactive",
  "quiz",
  "data",
  "structure",
];

export interface BlockPaletteProps {
  lessonId: string;
  index: number;
  onClose: () => void;
}

export function BlockPalette({
  lessonId,
  index,
  onClose,
}: BlockPaletteProps): ReactElement {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = paletteOrder.filter((family) => {
      const meta = blockRegistry[family].palette;
      if (term.length === 0) return true;
      return (
        meta.label.toLowerCase().includes(term) ||
        meta.description.toLowerCase().includes(term) ||
        family.toLowerCase().includes(term)
      );
    });
    const byGroup = new Map<PaletteGroup, BlockFamily[]>();
    for (const family of matches) {
      const group = blockRegistry[family].palette.group;
      const list = byGroup.get(group) ?? [];
      list.push(family);
      byGroup.set(group, list);
    }
    return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
      group,
      families: byGroup.get(group) ?? [],
    }));
  }, [query]);

  const pick = (family: BlockFamily): void => {
    insertBlock(lessonId, family, index);
    onClose();
  };

  return (
    <div
      className="fe-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Insert block"
      onClick={onClose}
    >
      <div className="fe-modal" onClick={(event) => event.stopPropagation()}>
        <div className="fe-modal-header">
          <span className="fe-palette-search">
            <Search size={14} aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search blocks"
              aria-label="Search blocks"
              onKeyDown={(event) => {
                if (event.key === "Escape") onClose();
              }}
            />
          </span>
          <button
            type="button"
            className="fe-icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close block palette"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="fe-palette-body">
          {groups.length === 0 ? (
            <p className="fe-muted">No blocks match "{query}".</p>
          ) : null}
          {groups.map(({ group, families }) => (
            <section key={group} className="fe-palette-group">
              <h3>{GROUP_LABELS[group]}</h3>
              <div className="fe-palette-grid">
                {families.map((family) => {
                  const meta = blockRegistry[family].palette;
                  return (
                    <button
                      key={family}
                      type="button"
                      className="fe-palette-item"
                      onClick={() => pick(family)}
                    >
                      <span className="fe-palette-item-label">{meta.label}</span>
                      <span className="fe-palette-item-desc">{meta.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

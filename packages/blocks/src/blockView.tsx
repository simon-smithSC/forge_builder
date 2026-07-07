import type { CSSProperties, ReactElement } from "react";
import type { Block } from "@forge/schema";
import { getRegistryEntry } from "./index.js";
import { resolveContentWidth } from "./registry.js";

const PADDING_SCALE_REM = [0, 0.75, 1.5, 2.5, 4, 6] as const;

/**
 * Applies the shared BlockSettings envelope and renders the family's single
 * Renderer. Both the editor canvas and the player mount blocks through this.
 *
 * Structure (Rise parity, teardown "full-width block bands"):
 * - the outer <section> is the BAND: it spans the full canvas width and
 *   paints settings.backgroundColor (or a variant band color) edge to edge;
 * - the inner div is the centered content COLUMN, sized by the family's
 *   contentWidth hint ("column" ~46rem, "wide" ~64rem, "full" unbounded).
 */
export function BlockView({ block }: { block: Block }): ReactElement {
  const entry = getRegistryEntry(block.family);
  const style: CSSProperties = {
    paddingTop: `${PADDING_SCALE_REM[block.settings.paddingTop] ?? 0}rem`,
    paddingBottom: `${PADDING_SCALE_REM[block.settings.paddingBottom] ?? 0}rem`,
  };
  if (block.settings.backgroundColor) {
    style.backgroundColor = block.settings.backgroundColor;
  }
  if (
    typeof block.settings.textColorMode === "object" &&
    block.settings.textColorMode.mode === "explicit"
  ) {
    style.color = block.settings.textColorMode.color;
  }
  const width = resolveContentWidth(entry.contentWidth, block.variant);
  const Renderer = entry.Renderer;
  return (
    <section
      className={`fb-block fb-width-${width} fb-family-${block.family.replace(/[^a-zA-Z]/g, "")}`}
      style={style}
      id={block.settings.anchorId}
      data-block-id={block.id}
      data-family={block.family}
      data-variant={block.variant}
    >
      <div className="fb-block-inner">
        <Renderer block={block} />
      </div>
    </section>
  );
}

import type { CSSProperties, ReactElement } from "react";
import type { Block } from "@forge/schema";
import { getRegistryEntry } from "./index.js";

const PADDING_SCALE_REM = [0, 0.75, 1.5, 2.5, 4, 6] as const;

/**
 * Applies the shared BlockSettings envelope (padding, background, text color,
 * anchor) and renders the family's single Renderer. Both the editor canvas and
 * the player mount blocks through this component.
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
  const Renderer = entry.Renderer;
  return (
    <section
      className={`fb-block fb-family-${block.family.replace(/[^a-zA-Z]/g, "")}`}
      style={style}
      id={block.settings.anchorId}
      data-block-id={block.id}
      data-family={block.family}
      data-variant={block.variant}
    >
      <Renderer block={block} />
    </section>
  );
}

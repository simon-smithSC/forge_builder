import type { BlockFamily } from "@forge/schema";
import type { BlockRegistryEntry } from "./registry.js";
import { textEntry } from "./families/text.js";
import { impactEntry } from "./families/impact.js";
import { listEntry } from "./families/list.js";
import { imageEntry } from "./families/image.js";
import { galleryEntry } from "./families/gallery.js";
import { dividerEntry } from "./families/divider.js";
import { multimediaEntry } from "./families/multimedia.js";
import { interactiveEntry } from "./families/interactive.js";
import { interactiveFullscreenEntry } from "./families/interactiveFullscreen.js";
import { flashcardEntry } from "./families/flashcard.js";
import { buttonsEntry } from "./families/buttons.js";
import { knowledgeCheckEntry } from "./families/knowledgeCheck.js";
import { chartEntry } from "./families/chart.js";
import { tableEntry } from "./families/table.js";
import { audioEntry } from "./families/audio.js";
import { calloutEntry } from "./families/callout.js";
import { scenarioEntry } from "./families/scenario.js";
import { checklistEntry } from "./families/checklist.js";

export type {
  BlockEvents,
  InlineEditingPort,
  RenderContext,
  RenderMode,
} from "./context.js";
export {
  BlockRenderContext,
  defaultRenderContext,
  useRenderContext,
} from "./context.js";
export type {
  BlockContentWidth,
  BlockRegistryEntry,
  BlockRendererProps,
  ContentWidthHint,
  PaletteGroup,
  PaletteMeta,
} from "./registry.js";
export {
  resolveContentWidth,
  validateWithSchema,
  variantsOf,
} from "./registry.js";
export { EditableHtml, Html, MediaPlaceholder } from "./html.js";
export { BlockView } from "./blockView.js";

export const blockRegistry: Record<BlockFamily, BlockRegistryEntry> = {
  text: textEntry,
  impact: impactEntry,
  list: listEntry,
  image: imageEntry,
  gallery: galleryEntry,
  divider: dividerEntry,
  multimedia: multimediaEntry,
  interactive: interactiveEntry,
  "interactive-fullscreen": interactiveFullscreenEntry,
  flashcard: flashcardEntry,
  buttons: buttonsEntry,
  knowledgeCheck: knowledgeCheckEntry,
  chart: chartEntry,
  table: tableEntry,
  audio: audioEntry,
  callout: calloutEntry,
  scenario: scenarioEntry,
  checklist: checklistEntry,
};

export function getRegistryEntry(family: BlockFamily): BlockRegistryEntry {
  const entry = blockRegistry[family];
  if (!entry) throw new Error(`No registry entry for family "${family}".`);
  return entry;
}

export const paletteOrder: readonly BlockFamily[] = [
  "text",
  "impact",
  "list",
  "image",
  "gallery",
  "multimedia",
  "interactive",
  "interactive-fullscreen",
  "flashcard",
  "buttons",
  "knowledgeCheck",
  "chart",
  "table",
  "audio",
  "callout",
  "scenario",
  "checklist",
  "divider",
];

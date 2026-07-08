// Settings-tray auto-open policy (V1.1). Selecting a block never opens the
// tray; INSERTING one may, but only for config-heavy families whose default
// payload is not meaningfully editable inline on the canvas. Text-like
// families (text, impact, list, divider, callout, checklist) are edited in
// place, so inserting them only selects. Shared by actions.insertBlock and
// libraryActions.insertBlockVariant.
import type { BlockFamily } from "@forge/schema";

export const AUTO_OPEN_FAMILIES: ReadonlySet<BlockFamily> = new Set<BlockFamily>([
  "image",
  "gallery",
  "multimedia",
  "audio",
  "chart",
  "table",
  "buttons",
  "knowledgeCheck",
  "interactive",
  "interactive-fullscreen",
  "flashcard",
  "scenario",
]);

export function shouldAutoOpenSettings(family: BlockFamily): boolean {
  return AUTO_OPEN_FAMILIES.has(family);
}

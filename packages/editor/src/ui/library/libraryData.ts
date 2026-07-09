// P4 category/variant mapping for the two-tier insertion model. The quick-add
// strip follows the teardown's observed order (Block Creation Model); the
// full library's category rail follows the teardown taxonomy (Block Library)
// mapped onto Forge families, with Forge-only additions grouped at the end.
// Every registry family+variant appears in exactly ONE category.
import { blockRegistry } from "@forge/blocks";
import type { BlockFamily } from "@forge/schema";
import { variantLabel } from "../variantLabels.js";

export interface LibraryCard {
  family: BlockFamily;
  variant: string;
  label: string;
  description: string;
  /** Palette icon name, mapped to lucide via blockIcons.ts. */
  icon: string;
}

/** Thumb tint group (5B.6): rendered as data-cat on .fe-lib-card-thumb.
 * text-ish -> cobalt, media -> info, interactive -> ember, knowledge ->
 * success (styling in library.css, existing primitives only). */
export type LibraryTint = "text" | "media" | "interactive" | "quiz";

export interface LibraryCategory {
  id: string;
  label: string;
  /** Thumb tint for every card in this category. */
  tint: LibraryTint;
  cards: readonly LibraryCard[];
}

export interface QuickAddItem {
  label: string;
  family: BlockFamily;
  variant: string;
  icon: string;
}

function card(
  family: BlockFamily,
  variant: string,
  description: string,
  label?: string,
): LibraryCard {
  const palette = blockRegistry[family].palette;
  return {
    family,
    variant,
    label: label ?? variantLabel(palette.label, variant),
    description,
    icon: palette.icon,
  };
}

/** Teardown quick-add order: Text, List, Image, Video, Process, Flashcards,
 * Sorting, Continue (the "Block library" entry is the strip's All blocks
 * chip, rendered by the component). */
export const quickAddItems: readonly QuickAddItem[] = [
  { label: "Text", family: "text", variant: "paragraph", icon: "type" },
  { label: "List", family: "list", variant: "bulleted", icon: "list" },
  { label: "Image", family: "image", variant: "centered", icon: "image" },
  { label: "Video", family: "multimedia", variant: "video", icon: "clapperboard" },
  {
    label: "Process",
    family: "interactive-fullscreen",
    variant: "process",
    icon: "expand",
  },
  { label: "Flashcards", family: "flashcard", variant: "grid", icon: "layers" },
  {
    label: "Sorting",
    family: "interactive-fullscreen",
    variant: "sorting",
    icon: "expand",
  },
  {
    label: "Continue",
    family: "divider",
    variant: "continue button",
    icon: "minus",
  },
];

export const libraryCategories: readonly LibraryCategory[] = [
  {
    id: "text",
    label: "Text",
    tint: "text",
    cards: [
      card("text", "paragraph", "A single body paragraph."),
      card("text", "heading", "A standalone heading."),
      card("text", "subheading", "A standalone subheading."),
      card("text", "heading+paragraph", "Heading with body copy below."),
      card("text", "subheading+paragraph", "Subheading with body copy below."),
      card("text", "two column", "Body copy split across two columns."),
    ],
  },
  {
    id: "statement",
    label: "Statement",
    tint: "text",
    cards: [
      card("impact", "a", "High-impact statement, treatment A."),
      card("impact", "b", "High-impact statement, treatment B."),
      card("impact", "c", "High-impact statement, treatment C."),
      card("impact", "d", "Full-width statement band, treatment D."),
    ],
  },
  {
    id: "quote",
    label: "Quote",
    tint: "text",
    cards: [
      card("impact", "note", "Quoted text on a note card with attribution.", "Quote"),
    ],
  },
  {
    id: "list",
    label: "List",
    tint: "text",
    cards: [
      card("list", "bulleted", "Bulleted list of items."),
      card("list", "numbered", "Numbered list of items."),
      card("list", "checkboxes", "Checkbox list learners can tick."),
    ],
  },
  {
    id: "image",
    label: "Image",
    tint: "media",
    cards: [
      card("image", "hero", "Large hero image treatment."),
      card("image", "full width", "Image spanning the full column."),
      card("image", "centered", "Centered image with optional caption."),
      card("image", "text aside", "Image with text alongside."),
      card("image", "banner", "Short banner-style image."),
    ],
  },
  {
    id: "gallery",
    label: "Gallery",
    tint: "media",
    cards: [
      card("gallery", "carousel (centered)", "Carousel with a 1 of N counter."),
      card("gallery", "two column grid", "Image grid, two columns."),
      card("gallery", "three column grid", "Image grid, three columns."),
      card("gallery", "four column grid", "Image grid, four columns."),
    ],
  },
  {
    id: "multimedia",
    label: "Multimedia",
    tint: "media",
    cards: [
      card("multimedia", "video", "Video with captions and a transcript."),
      card("multimedia", "embed", "Embed external content by URL."),
      card("multimedia", "attachment", "Downloadable file attachment."),
    ],
  },
  {
    id: "interactive",
    label: "Interactive",
    tint: "interactive",
    cards: [
      card("interactive", "accordion", "Expandable sections, one per topic."),
      card("interactive", "tabs", "Tabbed panels, keyboard accessible."),
      card("interactive-fullscreen", "process", "Step-by-step process with intro and summary."),
      card("interactive-fullscreen", "labeled graphic", "Image with clickable markers."),
      card("interactive-fullscreen", "timeline", "Labeled events on a vertical timeline."),
      card("interactive-fullscreen", "sorting", "Sort items into category piles."),
      card("flashcard", "single card", "One flip card.", "Flashcard"),
      card("flashcard", "grid", "Grid of flip cards.", "Flashcard grid"),
      card("flashcard", "stack", "Deck of flip cards.", "Flashcard stack"),
      card("buttons", "single button", "One action button.", "Button"),
      card("buttons", "button stack", "Stacked action buttons."),
    ],
  },
  {
    id: "knowledge-check",
    label: "Knowledge check",
    tint: "quiz",
    cards: [
      card("knowledgeCheck", "multiple choice", "Pick the one correct answer."),
      card("knowledgeCheck", "multiple response", "Pick every correct answer."),
      card("knowledgeCheck", "fill in the blank", "Type the missing answer."),
      card("knowledgeCheck", "matching", "Match pairs of items."),
    ],
  },
  {
    id: "chart",
    label: "Chart",
    tint: "media",
    cards: [
      card("chart", "bar", "Bar chart with a data table.", "Bar chart"),
      card("chart", "line", "Line chart with a data table.", "Line chart"),
      card("chart", "pie", "Pie chart with a data table.", "Pie chart"),
    ],
  },
  {
    id: "divider",
    label: "Divider",
    tint: "interactive",
    cards: [
      card("divider", "line", "Thin horizontal rule."),
      card("divider", "numbered", "Numbered section divider."),
      card("divider", "spacer", "Invisible vertical space."),
      card("divider", "continue button", "Continue button that gates progress."),
      card(
        "divider",
        "screen bar",
        "Empty full-width band; use padding and background for spacing.",
      ),
    ],
  },
  {
    id: "code",
    label: "Code",
    tint: "media",
    cards: [
      card("multimedia", "code", "Code snippet with copy and line numbers.", "Code"),
    ],
  },
  {
    id: "table",
    label: "Table",
    tint: "media",
    cards: [
      card("table", "basic", "Simple data table.", "Table"),
      card(
        "table",
        "header row/col options",
        "Table with header row and column options.",
        "Table with headers",
      ),
    ],
  },
  {
    id: "callout",
    label: "Callout",
    tint: "text",
    cards: [
      card("callout", "info", "Informational note.", "Info callout"),
      card("callout", "warning", "Warning note.", "Warning callout"),
      card("callout", "success", "Success note.", "Success callout"),
      card("callout", "danger", "Danger note.", "Danger callout"),
    ],
  },
  {
    id: "scenario",
    label: "Scenario",
    tint: "interactive",
    cards: [
      card("scenario", "branching scene", "Branching scenes with choices and feedback."),
    ],
  },
  {
    id: "checklist",
    label: "Checklist",
    tint: "interactive",
    cards: [card("checklist", "task checklist", "Tasks learners tick off.")],
  },
  {
    id: "audio",
    label: "Audio",
    tint: "media",
    cards: [card("audio", "standalone audio", "Audio clip with a transcript.", "Audio")],
  },
];

// ---- recently used (session-local, last 6 family+variant pairs) ----

export interface RecentPick {
  family: BlockFamily;
  variant: string;
}

let recents: RecentPick[] = [];

export function recordRecentPick(family: BlockFamily, variant: string): void {
  recents = [
    { family, variant },
    ...recents.filter((pick) => pick.family !== family || pick.variant !== variant),
  ].slice(0, 6);
}

export function getRecentPicks(): readonly RecentPick[] {
  return recents;
}

/** Find the library card for a family+variant pair (used by Recently used). */
export function findCard(family: BlockFamily, variant: string): LibraryCard | undefined {
  for (const category of libraryCategories) {
    const match = category.cards.find(
      (item) => item.family === family && item.variant === variant,
    );
    if (match) return match;
  }
  return undefined;
}

/** Tint group of the category owning a family+variant pair (5B.6), for
 * cards rendered outside their category section (Recently used). */
export function cardTint(family: BlockFamily, variant: string): LibraryTint | undefined {
  for (const category of libraryCategories) {
    if (
      category.cards.some(
        (item) => item.family === family && item.variant === variant,
      )
    ) {
      return category.tint;
    }
  }
  return undefined;
}

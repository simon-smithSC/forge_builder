# Rise 360 Example Course Teardown

Date: 2026-07-07

Source inspected: `Example Course` in Rise 360, course id `Yx0A4TvvXBfvCVU1Bcbc7tLl41CmmDsR`.

Scope: course overview, lesson authoring, block library, block controls, settings surfaces, learner preview, publish-relevant behaviour, and block/variant behaviour visible in the example kitchen-sink course.

## Executive Summary

Rise is not a form-first editor. It is a live course canvas with contextual controls layered around blocks. The author sees the same broad page shape that the learner will see: a centered vertical course surface, full-width block bands, in-place rich text editing, per-block hover controls, and side panels that open only for focused editing. The most important UI pattern is that the block remains visible while editing. Settings are secondary to direct manipulation.

Key product principles observed:

- The course overview is a structured outline and publishing hub.
- The lesson editor is a WYSIWYG authoring surface, not a separate property form.
- Blocks are inserted between existing blocks through visible plus controls.
- Each block exposes a small contextual rail: block type selector, content, style, format, move, duplicate, delete.
- The right drawer changes by block type and is titled for the specific block variant, for example `Edit Paragraph with heading`.
- Rich text is edited directly through TipTap/ProseMirror fields in the block.
- The block library has both a quick-add strip and a full block library.
- Learner preview is rendered in an iframe with the course theme applied and a course navigation sidebar.
- Preview contains actual learner interactions, not static summaries.

## Methodology

The teardown was performed against the live Rise browser tab. I inspected:

- Course overview DOM and visible controls.
- Lesson 1 authoring route.
- Lesson 1 preview route and preview iframe.
- Block quick-add strip.
- Full block library category rail.
- Repeated contextual block controls.
- Right-side block edit drawer.
- Rendered learner text in the preview iframe.

I avoided destructive changes: no deletion, no publish submission, no restore, no lesson takeover, and no irreversible edits.

## Course Overview Screen

### Purpose

The overview is the top-level course management screen. It combines course metadata, lesson outline, lesson creation, section grouping, and launch points into lesson editing and publishing.

### Layout

The screen uses a top app header and a main outline canvas.

Header:

- Left side contains `360 Home`.
- Course title appears in the header as `Example Course`.
- Right side contains course-level actions including theme/settings/publish/preview type controls.
- Undo and redo controls exist, disabled when no action is available.

Main content:

- Editable course title field labelled `Course Title`, populated with `Example Course`.
- Author name: `Simon Smith`.
- Editable course description field containing `This is the description of the course`.
- Vertical outline containing section headings, lessons, lesson type labels, edit links, and per-row actions.

### Outline Structure Observed

The example course contains:

- Course title: `Example Course`.
- Description: `This is the description of the course`.
- Empty lesson title field near the top with `Add a lesson title...`.
- Section: `This is a Section title`.
- Lesson: `Example Lesson 1`.
- Section: `Example Section 2`.
- Quiz lesson: `Example Lesson 2`.
- Empty lesson title field near the bottom with hint `Shift + Enter to add as a section`.

### Lesson Rows

Each lesson row has:

- Type marker, for example `Lesson` or `quiz`.
- Lesson title button.
- `Edit Content` link into the lesson authoring route.
- More menu.
- Adjacent insert controls.

### Section Rows

Each section row has:

- Section title button.
- Remove section control.
- Insert lesson controls above/below.

### Creation Behaviour

The overview exposes an `Add Content` button at the course level. Empty title inputs let authors add lessons inline. The hint `Shift + Enter to add as a section` indicates that the same input can create either a lesson or a section depending on keyboard behaviour.

### Editing/Ownership Behaviour

When the lesson was being edited elsewhere by the same account/session, the overview showed:

- `Simon Smith is editing 'Example Lesson 1'`.
- Recent edit timestamp.
- `CANCEL` and `TAKE CONTROL` actions.

This establishes a lesson-level editing ownership model. The unit of editing is the lesson, not the entire course. A competing edit state is communicated from the overview before entering the lesson.

## Lesson Authoring Screen

### Purpose

The lesson authoring screen is the main WYSIWYG editor. It presents a live vertical learner-style page with direct text editing and block-level rails.

### Layout

Header:

- Lesson dropdown labelled with current lesson, `Example Lesson 1`.
- Route back to course overview.
- Preview button.
- User identity.

Canvas:

- Vertical course surface.
- Top lesson title field as a textarea containing `Example Lesson 1`.
- Blocks rendered one after another.
- Plus buttons between blocks.
- Contextual block rail appears next to each block.

### Lesson Navigation Dropdown

The lesson dropdown shows:

- Current lesson: `Example Lesson 1`.
- Section group: `This is a Section title`.
- Section group: `Example Section 2`.
- Lesson links:
  - Untitled lesson.
  - Example Lesson 1.
  - Example Lesson 2.

This allows switching lessons without returning to the course overview.

### Block Creation Model

Between every block there is a visible plus button. The plus opens a quick-add strip and full block library entry.

Quick-add observed:

- Block library.
- Text.
- List.
- Image.
- Video.
- Process.
- Flashcards.
- Sorting.
- Continue.

The quick-add strip is biased toward common block types and fast insertion.

### Contextual Block Rail

Repeated on nearly every block:

- Block Selector.
- Content.
- Style.
- Format.
- Move up.
- Move down.
- Duplicate.
- Delete.

The first block omits `Move up`; the last block omits `Move down`. This confirms move controls are context-aware.

The rail is attached to the block, not a global settings area. It is a compact icon rail and appears adjacent to the block being acted on.

### Right Drawer

Clicking a block control opens a right-side drawer.

Observed drawer example:

- Header: `Edit Paragraph with heading`.
- Fields:
  - Heading rich text field.
  - Text rich text field.
  - Audio section.
  - `Add audio` action.

The drawer is block-specific and variant-specific. It does not use a generic all-purpose settings form.

### Direct Editing

Rich content fields are in-place TipTap/ProseMirror editables. The DOM exposes repeated editable areas with class names including `tiptap ProseMirror rise-tiptap`.

Directly editable content observed:

- Lesson title textarea.
- Text block heading.
- Text block body.
- Multiple text/list/interactivity item text fields.
- Button/location blocks with title and description rich text.

The core pattern is direct manipulation: click text, edit text, see the block in place.

## Learner Preview Screen

### Purpose

Preview gives an author a learner-facing rendering of the course while preserving a top shell to return to editing.

### Layout

Outer shell:

- Header text: `Course Preview`.
- Back button.
- `Edit` button.
- Preview content iframe.

Preview iframe:

- Course navigation/sidebar.
- Course title: `Example Course`.
- Progress: `0% COMPLETE` initially.
- Section labels:
  - `This is a Section title`.
  - `Example Section 2`.
- Lesson list:
  - Example Lesson 1.
  - Example Lesson 2.
- Lesson header:
  - `Lesson 1 of 2`.
  - `Example Lesson 1`.
  - Author attribution: `By Simon Smith`.
- Blocks rendered with course theme.

### Theme in Preview

The preview iframe exposes course theme variables:

- Theme color: `#ff631e`.
- Body font: Merriweather.
- Heading/UI font: Lato.
- Brand color classes are applied throughout.

This matters because Rise preview and export are theme-bound. Blocks do not render in isolation from the course theme.

### Learner Progress

Preview shows progress text such as:

- `0% COMPLETE`.
- After a continue interaction: `13% Completed`.

Continue/divider interactions can gate progress.

### Preview Behaviour

The preview is not a static screenshot. It renders:

- Actual lesson navigation.
- Continue button progress.
- Interactive components.
- Quiz/knowledge check controls.
- Media embeds.
- Sorting.
- Flashcards.
- Charts.
- Buttons.

## Block Library

### Full Library Category Rail

The full block library opens as a side panel with a left category rail and visual choices on the right.

Categories observed:

- Text.
- Statement.
- Quote.
- List.
- Image.
- Gallery.
- Multimedia.
- Interactive.
- Knowledge check.
- Chart.
- Divider.
- Block templates.
- Code.
- Custom block, Beta.

Custom block subcategories observed:

- Blank.
- Audio Guides.
- Comparisons.
- Conversations.
- Core Concepts.
- Diagrams.
- Introductions.
- Mixed Media.
- Organization.
- Personas.
- Prompts.
- Testimonials.

### Library Interaction Pattern

The library has:

- Category rail on the left.
- Active category highlight.
- Right-side visual block choices.
- Block choices represented as preview cards/buttons, many with thumbnail-like visual previews rather than just text labels.
- Insertion happens from the selected category/card.

### Quick Add vs Full Library

Quick add is optimized for frequent insertions:

- Text.
- List.
- Image.
- Video.
- Process.
- Flashcards.
- Sorting.
- Continue.

Full library is for discovery and selecting specific variants.

## Global Block Behaviour

### Every Block

Common authoring behaviour:

- Plus button before/after for insertion.
- Hover/focus rail with content/style/format controls.
- Move up/down where valid.
- Duplicate.
- Delete.
- Block selector/convert control.
- WYSIWYG block remains visible while editing.

### Content Control

The content drawer edits the semantic payload:

- Text fields.
- Headings.
- Item lists.
- Media source/upload.
- Audio.
- Answers.
- Links.
- Data series.

### Style Control

Style is block-specific. It is expected to affect visible block treatment directly, not only store metadata.

Observed style-related surfaces include:

- Variant drop-down style cards, exposed in the DOM as preview dropdown buttons.
- Layout choices such as accordion/tabs, flashcard grid/stack, button/button stack, chart type.
- Visual treatments such as paragraph with heading.

### Format Control

Format is distinct from content and style. It is used for presentation-level changes within the selected block. For text-like blocks this likely includes spacing, alignment, heading treatment, and rich formatting controls. In practice it appears as a contextual surface opened from the same block rail.

### Block Selector

The block selector is a conversion/change-type affordance. It sits alongside Content, Style, and Format rather than inside the settings drawer. This implies block type switching is a first-class action.

## Block And Variant Teardown

### Text

Observed variants/patterns:

- Paragraph with heading.
- Plain paragraph.
- Heading-only.
- Heading plus paragraph.
- Subheading-like copy.
- Multi-column/two-column text patterns in the broader example.

Authoring layout:

- Text appears inline in the page.
- Heading and body are separate rich text editables.
- Content drawer for `Paragraph with heading` shows a heading field and body text field.
- Optional audio can be associated with text blocks through an `Audio` section and `Add audio`.

Learner behaviour:

- Renders as direct reading content.
- Heading scale and spacing vary by variant.
- Body copy uses course body font.

Settings/options:

- Content: heading, text, optional audio.
- Style: text layout/variant.
- Format: rich text formatting and presentation.

Forge implication:

- Text must not be a single textarea plus generic style dropdown.
- Heading, paragraph, paragraph with heading, subheading, and column variants need distinct visible renderers.
- Inline editing is required.

### Statement

Purpose:

- High-impact standalone text block.

Authoring behaviour:

- Selected from its own library category.
- Treated as separate from ordinary Text.
- Uses a more prominent visual style.

Learner behaviour:

- Pulls attention through scale, spacing, and/or framed emphasis.

Settings/options:

- Text payload.
- Visual statement variant.
- Formatting controls.

Forge implication:

- Statement should be its own block family or clear variant with large visual differences.

### Quote

Purpose:

- Quoted or attributed passage.

Authoring behaviour:

- Separate library category.
- Likely includes quote text and attribution/citation fields.

Learner behaviour:

- Styled as quotation, distinct from statement and ordinary body copy.

Settings/options:

- Quote text.
- Attribution.
- Style/treatment.

Forge implication:

- Quote should support attribution and not collapse into generic text.

### List

Observed variants:

- Numbered list.
- Unordered/bulleted list.
- Checkbox list.

Authoring layout:

- Items are directly editable.
- Checkbox variant shows checkbox inputs in authoring.
- Ordered variant displays visible numbers.
- Bulleted variant displays bullets.

Learner behaviour:

- Numbered list communicates sequence.
- Bulleted list communicates unordered items.
- Checkbox list gives checklist-like visual affordance, likely cosmetic in Rise text-list context unless configured as an interaction elsewhere.

Settings/options:

- List type.
- Item text.
- Formatting.

Forge implication:

- Numbered, bulleted, and checkbox lists must render differently in editor, preview, and export.

### Image

Observed:

- Image category exists in full library.
- Quick-add has `Image`.
- Existing course includes placeholder-ish image blocks labelled `asd` and image positions.

Authoring behaviour:

- Image blocks use content/style controls.
- Expected fields include upload/change image, crop/focal or layout, alt text, caption.

Learner behaviour:

- Renders image with optional caption and possible layout variants.

Settings/options:

- Image source/upload.
- Alt text.
- Caption.
- Layout/style.

Forge implication:

- File picker/media picker must be first-class.
- URL-only image entry is insufficient.

### Gallery

Observed:

- Gallery category exists in full library.
- Learner/editor content includes carousel state such as `1 of 2`.
- Preview exposes carousel controls.

Authoring layout:

- Multiple images/items.
- Each gallery item likely has image, alt/caption, and ordering.
- Variant controls affect grid/carousel presentation.

Learner behaviour:

- Carousel variant shows one item at a time with slide count.
- Grid variants show multiple images.

Settings/options:

- Add/remove/reorder images.
- Caption visibility.
- Layout: carousel or grid columns.

Forge implication:

- Gallery needs item-level media management and a working carousel in preview/export.

### Multimedia

Observed variants/options:

- Video.
- Embed.
- Attachment.
- Code snippet.
- Audio also appears in content drawers and quick-add context.

Video observed:

- Vimeo embed.
- Provider label `VIMEO`.
- Title `Elk Mountains`.
- Description text.
- `VIEW ON VIMEO` link.

Attachment observed:

- `File Attachment Block`.
- `No file added`.

Code observed:

- Code snippet renders source code.
- `Copy` button exists.

Authoring behaviour:

- Video/embed accept media source or embed URL.
- Attachment expects a file.
- Code snippet accepts code content and likely language formatting.

Learner behaviour:

- Video embeds in the page.
- Attachments become downloadable resources.
- Code snippets are readable and copyable.

Settings/options:

- Source/upload.
- Caption/description.
- Attachment file metadata.
- Code language/copy behaviour.

Forge implication:

- Multimedia export must package or preserve media correctly.
- Code needs syntax/copy affordance.
- Attachment cannot be placeholder-only.

### Interactive - Process

Observed:

- Quick-add includes `Process`.
- Example process has:
  - `1 of 4 Introduction`.
  - `START`.
  - `2 of 4 Step 1`.
  - `3 of 4 Step 2`.
  - `4 of 4 Summary`.
  - `START AGAIN`.

Authoring layout:

- Structured sequence with intro, steps, and summary.
- Each step has label/title/body.
- Step count is visible.

Learner behaviour:

- Learner moves through a guided sequence.
- Start/start again controls reset or replay.

Settings/options:

- Add/remove/reorder steps.
- Step titles and body copy.
- Intro/summary.
- Visual layout.

Forge implication:

- Process is not just accordion. It needs sequential state and controls.

### Interactive - Accordion

Observed:

- Preview dropdown exposes `Accordion`.
- Existing content includes three headings: `Embracing Discovery`, `Gaining Insight`, `Making It Real`.
- Accordion variant has expandable headers.

Authoring layout:

- Items with title/body.
- Content drawer likely edits each item.
- Style selector changes from accordion to tabs.

Learner behaviour:

- Clicking a header expands/collapses content.
- Multiple panels may be possible depending on settings.

Settings/options:

- Items.
- Panel titles.
- Panel body.
- Variant/style.

Forge implication:

- Accordion must work in preview and export; static display is not enough.

### Interactive - Tabs

Observed:

- Preview dropdown exposes `Tabs`.
- Existing tab block has headers:
  - `EMBRACING DISCOVERY`.
  - `GAINING INSIGHT`.
  - `MAKING IT REAL`.
- Active tab renders content below.

Authoring layout:

- Tab labels are editable.
- Tab content is editable.
- Active tab can be selected while authoring.

Learner behaviour:

- Clicking a tab swaps visible panel content.
- Only one panel is active at a time.

Settings/options:

- Tab labels.
- Tab content.
- Layout/style.

Forge implication:

- Tabs need live tab state, keyboard-accessible buttons, and active styling.

### Interactive - Labeled Graphic

Observed:

- Preview dropdown exposes `Labeled graphic`.
- DOM contains marker buttons:
  - `Marker, Item 1, Plus, Not viewed`.
  - `Marker, Item 2, Plus, Not viewed`.
- Marker opens a bubble/modal with:
  - Item title.
  - Body text.
  - Close.
  - Previous.
  - Next.

Authoring layout:

- Base image/graphic.
- Positioned markers.
- Each marker has title/body.
- Marker state and bubble placement are visual.

Learner behaviour:

- Click marker to open a floating bubble.
- Bubble supports next/previous navigation and close.
- Marker viewed state changes.

Settings/options:

- Base image.
- Marker location.
- Marker icon/style.
- Marker title/body.

Forge implication:

- Needs coordinate-based markers and modal/popover behaviour.

### Interactive - Sorting

Observed:

- Quick-add includes `Sorting`.
- Preview dropdown exposes `Sorting activity`.
- Example sorting text:
  - `Current item: Item 1` or `Current item: Item 2`.
  - Items: `Item 1`, `Item 2`.
  - Categories: `Category 1`, `Category 2`.

Authoring layout:

- Items and categories are configured.
- Learner sorts items into categories.

Learner behaviour:

- Presents current item and target categories.
- Learner assigns item to a category.
- State changes as items are sorted.

Settings/options:

- Items.
- Categories.
- Correct category mapping.
- Feedback.

Forge implication:

- Sorting must be an actual interaction with answers and state, not a static list.

### Interactive - Timeline

Observed:

- Preview dropdown exposes `Timeline`.
- Existing timeline content:
  - Date 1.
  - Event 1 Title.
  - Event body.
  - Date 2.
  - Event 2 Title.
  - Event body.

Authoring layout:

- Timeline event list.
- Each event has date, title, body.

Learner behaviour:

- Displays chronological event stack.
- May use vertical rhythm/markers.

Settings/options:

- Add/remove/reorder events.
- Date labels.
- Event titles and body.

Forge implication:

- Timeline is a structured variant, not generic cards.

### Flashcards

Observed variants:

- Flashcard grid.
- Flashcard stack.
- Single-card/stack display with `1 of 3`.

Observed content:

- `Click to flip`.
- `Front of card 1`.
- `Back of card 1`.
- `Front of card 2`.
- `Front of card 3`.
- `Back of card 3`.

Authoring layout:

- Cards have front/back fields.
- Cards can be added, removed, and ordered.
- Variant controls grid versus stack.

Learner behaviour:

- Click/tap card to flip.
- Grid shows multiple cards.
- Stack shows one card at a time with count.

Settings/options:

- Front content.
- Back content.
- Layout: grid/stack.
- Card count/order.

Forge implication:

- Flashcards require flip state in preview/export.
- Stack requires carousel-like navigation/counting.

### Knowledge Check

Observed variants:

- Multiple choice.
- Multiple response.
- Fill in the blank.

Observed behaviour:

- Question title placeholder: `Enter a question title here...`.
- Options:
  - Choice 1.
  - Choice 2.
  - Choice 3.
  - Choice 4.
- `SUBMIT`.
- Incorrect state.
- `TAKE AGAIN`.
- Fill blank input placeholder: `Type your answer here`.

Authoring layout:

- Question stem/title.
- Answer options.
- Correct answer selection through radio/checkbox input controls.
- Feedback/retake behaviour.

Learner behaviour:

- Learner selects answer(s) or types text.
- Submit evaluates.
- Incorrect state shows feedback.
- Take again resets attempt.

Settings/options:

- Question text.
- Option text.
- Correct option(s).
- Accepted text answers.
- Feedback.
- Retake/attempt behaviour.

Forge implication:

- Knowledge check variants must be fully operable in preview/export.
- Correct answer must not be preselected for learners.

### Chart

Observed variants:

- Bar chart.
- Line chart.
- Pie chart.

Observed content:

- `Bar Chart Title`.
- `Line Chart Title`.
- `Pie Chart Title`.
- Accessibility instruction: `Use arrow keys to navigate data points. Screen reader users may need to switch modes to interact.`
- Data:
  - Item 1: 70.
  - Item 2: 30.

Authoring layout:

- Chart title.
- Data items with labels/values.
- Chart type selection.

Learner behaviour:

- Chart is interactive/accessibility-aware.
- Pie chart exposes underlying item data text.

Settings/options:

- Chart type.
- Data labels.
- Values.
- Colors or theme application.
- Accessible data representation.

Forge implication:

- Charts need accessible text/table fallback and keyboard-aware chart rendering.

### Divider

Observed variants:

- Continue divider.
- Numbered divider.
- Divider/spacer variants likely present through the divider category.

Observed content:

- `CONTINUE`.
- Numbered divider 1.
- Numbered divider 2.

Learner behaviour:

- Continue button gates progress and advances completion.
- Numbered divider visually separates sections.

Settings/options:

- Divider type.
- Label text.
- Number value/sequence.
- Continue button text.

Forge implication:

- Continue is functional; it should mark progress/completion.

### Buttons

Observed variants:

- Button.
- Button stack.

Observed content:

- `Location 1`.
- `Location 2`.
- `Location 3`.
- Description text: `This location can be a URL, another lesson, or an email address. You can type a description here.`
- Buttons:
  - `GO TO LOCATION 1`.
  - `GO TO LOCATION 2`.
  - `GO TO LOCATION 3`.

Authoring layout:

- Each item has title/description and destination.
- Hyperlink modal supports:
  - URL.
  - Lesson search.
  - Email address.
- Lesson dropdown in hyperlink modal showed:
  - Lesson 1: Example Lesson 1.
  - Lesson 2: Example Lesson 2.

Learner behaviour:

- Single button variant shows one location.
- Button stack shows multiple action buttons.
- Buttons navigate externally, to lessons, or to email.

Settings/options:

- Button label.
- Destination.
- Description text.
- Stack vs single layout.

Forge implication:

- Button settings must include typed destinations and internal lesson links.

### Code

Observed:

- Full library category: Code.
- Existing code snippet:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>title</title>
    <link rel="stylesheet" href="style.css">
    <script src="script.js"></script>
  </head>
  <body>
    <!-- page content -->
  </body>
</html>
```

Authoring layout:

- Code content field.
- Code block has copy button.
- Language/style likely selectable.

Learner behaviour:

- Displays monospaced code.
- `Copy` action copies snippet.

Settings/options:

- Code text.
- Language.
- Copy visibility.

Forge implication:

- Code blocks need syntax-aware rendering and copy behaviour.

### Block Templates

Observed:

- Full library category: Block templates.
- Template subcategories through Custom block/Beta:
  - Blank.
  - Audio Guides.
  - Comparisons.
  - Conversations.
  - Core Concepts.
  - Diagrams.
  - Introductions.
  - Mixed Media.
  - Organization.
  - Personas.
  - Prompts.
  - Testimonials.

Purpose:

- Template blocks are not simple primitive blocks. They are composed patterns that likely insert one or more configured block structures.

Forge implication:

- Templates should be treated separately from base block types.
- A future template system can produce configured block groups without expanding the primitive block taxonomy.

### Custom Block

Observed:

- `Custom block` marked `Beta`.
- Subcategory `Blank` and template-like categories.

Purpose:

- Allows a more flexible custom composition block.

Forge implication:

- Custom block support can be deferred, but the architecture should allow template/custom block definitions later.

## Screen-Level Teardown

### Screen: Course Overview

Primary jobs:

- Edit course title and description.
- Organize sections and lessons.
- Add lessons.
- Add sections.
- Open lesson editor.
- Open preview.
- Publish package.
- See editing ownership state.

Layout pattern:

- Header with global course controls.
- Centered course metadata.
- Vertical lesson outline.
- Inline lesson title inputs.
- Section/lesson row controls near each row.

Important behaviours:

- `Edit Content` opens lesson editor.
- Empty lesson title field creates new lessons.
- Shift+Enter creates sections.
- Editing lock state appears when lesson is being edited.

### Screen: Lesson Editor

Primary jobs:

- Edit lesson title.
- Add blocks.
- Edit block content directly.
- Change block variant/style/format.
- Reorder, duplicate, delete blocks.
- Preview lesson.

Layout pattern:

- Header with lesson navigation.
- Full-page WYSIWYG canvas.
- Plus controls between blocks.
- Contextual rail per block.
- Right-side drawer when editing block settings/content.

Important behaviours:

- Direct rich text editing with ProseMirror.
- Context rail appears with block focus/hover.
- Right drawer is block-specific.
- Block remains visible while drawer is open.

### Screen: Block Library

Primary jobs:

- Insert a new block.
- Browse block families and variants.
- Use common quick-adds.

Layout pattern:

- Quick-add strip from plus.
- Full library side panel.
- Left category rail.
- Right visual card grid.

Important behaviours:

- Quick-add covers frequent blocks.
- Full library exposes all categories.
- Active category changes the right panel.
- Variants are selected visually.

### Screen: Preview

Primary jobs:

- Check learner-facing course.
- Test interactions.
- Confirm theme and navigation.
- Return to editing.

Layout pattern:

- Outer authoring preview shell with back/edit.
- Inner learner iframe.
- Learner sidebar navigation.
- Themed course content.

Important behaviours:

- Renders actual course runtime.
- Continue gates progress.
- Blocks are interactive.
- Progress percentage updates.

## Cross-Cutting UI Patterns

### WYSIWYG Fidelity

Rise authoring keeps the block in situ. Even when opening a right drawer, the primary object remains the visible block. Forge should avoid form-first editing where the learner-facing block is only a preview of fields.

### Context Rail

The rail belongs to the block. It should not overlap content, should not remain globally expanded, and should expose only the controls that make sense for the selected block.

### Settings Should Be Specific

Rise does not show the same settings for every block. A text block, embed, quiz, chart, and flashcard have different editing surfaces.

### Direct Rich Text

Rich text is edited through inline ProseMirror fields. This gives authors immediate feedback on typography and spacing.

### Variants Must Visibly Change Render

Variants such as accordion/tabs, flashcard grid/stack, button/button stack, chart type, numbered/bulleted/checklist, and continue/numbered divider visibly change authoring and learner output.

### Learner Runtime Is Functional

Preview and export must execute interactions:

- Continue updates progress.
- Accordion/tabs change content.
- Flashcards flip.
- Sorting tracks choices.
- Knowledge checks submit and retake.
- Buttons navigate.
- Code copies.
- Charts expose data.

## Forge Implementation Checklist

### Must Match

- Course overview with editable title/description and lesson/section outline.
- Lesson-level editor with in-place WYSIWYG canvas.
- Plus insertion between blocks.
- Quick-add and full library.
- Block-specific contextual rail.
- Block-specific right drawer.
- Direct rich text editing.
- Functional preview and export runtime.
- Theme-bound learner preview.
- Lesson navigation in preview.
- Progress/completion behaviour.

### Block Families Required For Parity

- Text.
- Statement.
- Quote.
- List.
- Image.
- Gallery.
- Multimedia.
- Interactive.
- Process.
- Flashcards.
- Sorting.
- Knowledge check.
- Chart.
- Divider.
- Buttons.
- Code.
- Block templates.
- Custom block later.

### Variant Coverage Required

- Text: paragraph, heading, subheading, paragraph with heading, multi-column.
- List: numbered, bulleted, checkbox.
- Gallery: carousel, grid.
- Multimedia: video, embed, attachment, code, audio.
- Interactive: process, accordion, tabs, labeled graphic, timeline, sorting.
- Flashcards: grid, stack/single-card.
- Knowledge check: multiple choice, multiple response, fill in the blank.
- Chart: bar, line, pie.
- Divider: continue, numbered, line/spacer.
- Buttons: single, stack.

### Settings Coverage Required

- Text: heading/body, audio attachment, rich formatting.
- Image/gallery: media picker, alt text, captions, layout.
- Multimedia: source/upload/embed/file/code language.
- Interactive: item lists, item titles, item bodies, marker positions, categories.
- Knowledge check: question, answers, correct answers, feedback, retake/attempts.
- Chart: data, chart type, labels, accessible data.
- Divider: label/type/number/progress gate.
- Buttons: destination type, label, target, stacked/single layout.

## Risks For Forge

- A generic settings tray will feel wrong because Rise settings are block-specific.
- A preview that summarizes blocks will fail the Rise parity target.
- Image URL fields are not enough; Rise expects media-first workflows.
- Knowledge checks must be learner-operable and not reveal correct answers.
- Interactive blocks must preserve state in preview and export.
- Export must use the same functional runtime as preview.
- Visual variants must alter layout, not just metadata.

## Evidence Notes

Live DOM and preview iframe evidence showed:

- Course overview title/description/outline fields.
- Two lessons and two sections.
- Lesson 1 authoring surface with many kitchen-sink blocks.
- Repeated contextual block rail controls.
- Right drawer labelled `Edit Paragraph with heading`.
- ProseMirror/TipTap rich editables.
- Quick-add strip with common block insertions.
- Full library category rail.
- Learner preview iframe with course navigation and progress.
- Functional preview content including continue progress and interactive block text.


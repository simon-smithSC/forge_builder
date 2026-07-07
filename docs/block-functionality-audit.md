# Forge Block Functionality Audit

Date: 2026-07-04

## Rise Reference Notes

The open Rise tab was available in preview mode only during this pass. It exposed a learner preview shell with an Edit control, but the cookie overlay prevented reliable authoring-panel inspection without changing site preference state. The comparison below is therefore based on the visible Rise preview behavior, the Forge build spec parity table, and prior authoring observations: Rise block modifiers are expected to visibly change the authoring canvas and the learner preview, not merely save metadata.

## Root Causes Found

- Settings changed `settings.variant`, but most editor renderers did not read that value.
- Preview rendered many block families through a generic placeholder before quiz and knowledge-check renderers could run.
- Publish conversion read `style`, `tone`, or `layout`, but not the new canonical `variant`.
- Existing local courses created before the variant defaults loaded blocks as `standard`, so old courses could display invalid settings such as `QUIZ · STANDARD`.

## Fixed In This Pass

| Family | Functional modifier behavior now wired |
|---|---|
| text | Paragraph variant hides the heading in editor and preview. |
| heading | Section heading variant uses a smaller ruled heading treatment. |
| subheading | Compact variant removes supporting copy and tightens heading scale. |
| twoColumnText | Comparison variant frames the columns. |
| statement / quote | Note, pullquote, and testimonial variants change tone/framing and attribution visibility. |
| list | Bulleted, numbered, and checkbox variants render differently. |
| image | Layout variants affect sizing/framing; zoom toggle adds zoom affordance. |
| gallery | Grid/carousel/column variants affect visible layout; captions toggle is honored. |
| divider | Line, spacer, numbered, and continue variants render differently. |
| multimedia | Embed/video/attachment/code variants show different media framing and type cues. |
| interactive / process | Accordion/tabs/process/timeline/labeled/sorting variants alter layout; item numbers toggle is honored. |
| flashcard | Single-card/grid/stack variants change visible card set/layout. |
| buttons | Single/stack/inline variants alter button layout. |
| knowledgeCheck / quiz | Multiple-choice, multiple-response, and fill-blank variants render differently in editor and preview; feedback toggle is honored. |
| chart | Bar/line/pie variants alter the chart visual; data table label toggle is honored. |
| table | Header row, header column, compact, and comparison settings affect table render. |
| audio | Transcript visibility is honored. |
| scenario | Branching vs single-decision variants affect outcome display. |
| callout | Info/warning/success/danger tones affect visible treatment. |
| checklist | Multi-check vs single-select and required settings affect visible affordance. |

## Remaining Gaps Against Rise / Spec

- Rich text is still `contentEditable` text, not TipTap with marks, paste sanitization, markdown shortcuts, or contextual toolbars.
- Media picker is still local file input for images and text URL fields for other media; it is not a tabbed media library/upload/URL/team picker.
- Preview is now functionally correct for quiz and variants, but it is still implemented in the editor package rather than using a shared player renderer.
- Exporter is still a readiness/download JSON path, not a full zip package builder with runtime HTML, assets, tincan launch, or native xAPI statements.
- Interactive blocks are visual facsimiles; accordion/tabs/process interactions are not fully learner-operable yet.
- Quiz variants beyond multiple-choice/multiple-response/fill-blank need typed payloads for matching and richer feedback.

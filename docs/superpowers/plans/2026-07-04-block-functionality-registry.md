# Block Functionality Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder-style block variants with real authoring, preview, settings, and publish behavior for every current Forge block family and variant.

**Architecture:** Introduce a block registry contract that maps each family/variant to defaults, settings, editor rendering, preview rendering, summary, readiness, and publish data. Keep this MVP registry compatible with the design spec by using `variant` as the canonical selector and by isolating family logic so it can later move into `packages/blocks`, `packages/schema`, and `packages/player`.

**Tech Stack:** React 18, TypeScript strict, Vite, Vitest, existing editor domain model, existing publish model.

---

## File Structure

- Modify: `packages/editor/src/domain/courseModel.ts`
  - Keep canonical defaults for every family/variant.
  - Add richer payload defaults where variants need structured content.
- Modify: `packages/editor/src/domain/courseModel.test.ts`
  - Verify defaults include real payloads for all variants that need them.
- Modify: `packages/editor/src/ui/App.tsx`
  - Short-term: host registry helpers and block components in this file to avoid a risky large move.
  - Medium-term follow-up: extract to `packages/editor/src/ui/blocks/*`.
- Modify: `packages/editor/src/ui/styles.css`
  - Add real variant visuals and interaction states.
- Modify: `packages/editor/src/publish/publishModel.ts`
  - Preserve variant/content in publish payloads and readiness.
- Modify: `packages/editor/src/publish/publishModel.test.ts`
  - Validate completion markers and variant payload preservation.
- Maintain: `docs/block-functionality-audit.md`
  - Keep gap notes current after each slice.

## Task 1: Knowledge Check And Quiz Registry Slice

**Files:**
- Modify: `packages/editor/src/domain/courseModel.ts`
- Modify: `packages/editor/src/domain/courseModel.test.ts`
- Modify: `packages/editor/src/ui/App.tsx`
- Modify: `packages/editor/src/ui/styles.css`
- Modify: `packages/editor/src/publish/publishModel.ts`
- Modify: `packages/editor/src/publish/publishModel.test.ts`

- [ ] **Step 1: Write failing tests for quiz variants**

Add tests that require `knowledgeCheck` and `quiz` defaults to include:

```ts
settings: expect.objectContaining({ variant: "multiple-choice", attempts: 1, showFeedback: true })
content: expect.objectContaining({
  question: expect.any(String),
  options: expect.any(Array),
  correctOption: 0,
  feedback: expect.any(String),
  correctFeedback: expect.any(String),
  incorrectFeedback: expect.any(String),
  matches: expect.any(Array),
  acceptedAnswers: expect.any(Array),
})
```

Run:

```bash
pnpm --filter @forge/editor test -- src/domain/courseModel.test.ts
```

Expected: FAIL until defaults include all fields.

- [ ] **Step 2: Implement richer defaults**

Update `blockDefaults.knowledgeCheck` and `blockDefaults.quiz` so all question variants have payload data available without schema guessing:

```ts
content: {
  question: "Which response is correct?",
  options: ["Correct option", "Distractor option"],
  correctOption: 0,
  feedback: "Use feedback to reinforce the point.",
  correctFeedback: "Correct. This reinforces the key point.",
  incorrectFeedback: "Not quite. Review the feedback and try again.",
  acceptedAnswers: ["Correct option"],
  matches: [
    { prompt: "Term", match: "Definition" },
    { prompt: "Concept", match: "Example" },
  ],
}
```

- [ ] **Step 3: Implement real quiz variant rendering**

In `App.tsx`, make `EditableBlockContent` and `QuizPreview` render:

- `multiple-choice`: radio-like single correct marker.
- `multiple-response`: checkbox-like correct markers and multiple correct answers.
- `fill-blank`: editable accepted answers and learner input preview.
- `matching`: editable prompt/match pairs in authoring and matching rows in preview.

- [ ] **Step 4: Implement quiz settings controls**

`BlockSpecificSettings` for `knowledgeCheck` and `quiz` must expose:

- Attempts
- Show feedback
- Shuffle answers
- Correct feedback
- Incorrect feedback

- [ ] **Step 5: Publish/readiness mapping**

Ensure `toPublishCourse` and `validatePublishReadiness` preserve:

- family
- variant
- question body
- completion marker for both `quiz` and `knowledgeCheck`

- [ ] **Step 6: Verify**

Run:

```bash
pnpm --filter @forge/editor typecheck
pnpm --filter @forge/editor test
pnpm --filter @forge/editor build
```

Expected: all commands exit 0.

## Task 2: Media Blocks Slice

Implement real behavior for `image`, `gallery`, `multimedia`, and `audio`:

- Image variants alter layout and use picker-first image selection.
- Gallery supports grid/carousel, captions, and column counts.
- Multimedia supports video, embed URL, attachment, and code sample views.
- Audio supports source, title, transcript visibility.

Acceptance: no media variant renders as a generic card; preview and publish summaries expose the selected variant and required media fields.

## Task 3: Interactive Blocks Slice

Implement real behavior for `interactive`, `process`, `flashcard`, `scenario`, and `checklist`:

- Accordion/tabs render as distinct learner controls.
- Process/timeline/labeled graphic/sorting render with distinct structures.
- Flashcards expose front/back and single/grid/stack views.
- Scenario choices show outcomes and track-choice metadata.
- Checklist can be task/reflection and required/not required.

Acceptance: every variant has a real visual structure and settings alter that structure.

## Task 4: Text, Structure, And Data Slice

Implement real behavior for `text`, `heading`, `subheading`, `twoColumnText`, `statement`, `quote`, `list`, `divider`, `buttons`, `chart`, `table`, and `callout`:

- Text variants affect typography and editable fields.
- List variants are semantic `ul`, `ol`, or checkbox lists.
- Divider/button variants alter completion or layout affordance.
- Chart variants render bar/line/pie with accessible data fallback.
- Table settings alter headers and compact/comparison styling.

Acceptance: each settings modifier changes editor and preview output.

## Task 5: Extraction Follow-Up

After all variants are functional, extract registry and components:

- Create: `packages/editor/src/ui/blocks/registry.ts`
- Create: `packages/editor/src/ui/blocks/QuizBlock.tsx`
- Create one component file per high-complexity family group.

Acceptance: `App.tsx` no longer owns detailed family behavior.

## Verification Checklist

- [ ] Every current `BlockFamily` can be inserted.
- [ ] Every variant option causes a visible editor change.
- [ ] Every variant option causes a visible preview change.
- [ ] Quiz and knowledge-check variants are answerable or visibly structured in preview.
- [ ] Publish data preserves canonical `variant`.
- [ ] Readiness catches missing required fields and accepts valid completion markers.
- [ ] `pnpm --filter @forge/editor typecheck` passes.
- [ ] `pnpm --filter @forge/editor test` passes.
- [ ] `pnpm --filter @forge/editor build` passes.

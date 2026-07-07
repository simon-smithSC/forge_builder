# @forge/schema

`@forge/schema` is the source of truth for Forge course content, publish settings, xAPI State API documents, migrations, JSON Schema output, IRI helpers, and shared sanitizer settings.

## Scripts

- `pnpm --filter @forge/schema test`
- `pnpm --filter @forge/schema lint`
- `pnpm --filter @forge/schema build`
- `pnpm --filter @forge/schema generate:json-schema`

`build` compiles TypeScript and writes JSON Schema files to `packages/schema/dist/json/`.

## Fixture Note

`docs/reference/course.json` is not present in this workspace, so `fixtures/kitchen-sink.json` is a cleaned Forge-shaped fixture based on `docs/SPEC.md`. It includes every v1 block variant and every quiz question type.

## Course Identity

`CourseDoc.id` must be a ULID, for example `01JZ9S99Z8A0Y4Y6RAZ76D9M7F`. `defaultLocale` must be a BCP 47 locale, for example `en-US`.

`createUlid()` and `isUlid()` are exported for editor and API callers that need to create or validate course ids.

## CRDT Readiness

`materializeCourseDocForYjs(course)` stores course metadata in one Y.Doc and each lesson in its own Y.Doc. Block and question lists are Y.Array structures containing Y.Map items. Sanitized HTML fields are stored as Y.XmlFragment values. `roundTripCourseDocThroughYjs(course)` applies those Yjs updates into fresh documents and returns the JSON-shaped course. It throws when a payload contains values that are not representable as Yjs maps, arrays, primitives, or XML fragments.

## HTML Fragments

Rich text payload fields must pass the shared sanitizer policy. Tags outside `richTextSanitizerConfig.allowedTags`, event-handler attributes, and unsafe link schemes are rejected by `validateCourseDoc`.

Generated JSON Schema marks every rich text field with `description: "forge:sanitized-html-fragment"` and `x-forge-sanitizer`. API validators that consume `dist/json/course-doc.schema.json` must treat that metadata as a validation hook and call the exported `isSafeHtmlFragment()` helper on those fields.

## Block Envelope

```json
{
  "id": "block_text_paragraph",
  "family": "text",
  "variant": "paragraph",
  "payload": {
    "html": "<p>Body copy.</p>"
  },
  "settings": {
    "paddingTop": 2,
    "paddingBottom": 2,
    "textColorMode": "auto"
  }
}
```

## Text Payloads

```json
{
  "paragraph": { "html": "<p>Body copy.</p>" },
  "heading": { "heading": "<h2>Main heading</h2>" },
  "subheading": { "subheading": "<h3>Subheading</h3>" },
  "heading+paragraph": {
    "heading": "<h2>Main heading</h2>",
    "html": "<p>Supporting copy.</p>"
  },
  "subheading+paragraph": {
    "subheading": "<h3>Subheading</h3>",
    "html": "<p>Supporting copy.</p>"
  },
  "two column": {
    "columns": [
      { "id": "column_left", "html": "<p>Left column.</p>" },
      { "id": "column_right", "html": "<p>Right column.</p>" }
    ]
  }
}
```

## Impact Payloads

Variants `a`, `b`, `c`, `d`, and `note` share this payload.

```json
{
  "html": "<p>A strong statement.</p>",
  "attribution": "Forge"
}
```

## List Payloads

Variants `bulleted`, `numbered`, and `checkboxes` share item structure. `checked` is cosmetic.

```json
{
  "items": [
    { "id": "item_01", "html": "<p>First item.</p>" },
    { "id": "item_02", "html": "<p>Second item.</p>", "checked": true }
  ]
}
```

## Image Payloads

Variants `hero`, `full width`, `centered`, `text aside`, and `banner` share the media fields. `text aside` can include `text`.

```json
{
  "mediaId": "image_hero",
  "alt": "Hero image alt text",
  "caption": "Optional caption",
  "zoomOnClick": true,
  "text": "<p>Optional adjacent copy.</p>"
}
```

## Gallery Payloads

Variants `carousel (centered)`, `two column grid`, `three column grid`, and `four column grid` share this payload.

```json
{
  "items": [
    {
      "id": "gallery_01",
      "mediaId": "image_gallery_01",
      "alt": "Gallery image",
      "caption": "Optional caption"
    }
  ]
}
```

## Divider Payloads

```json
{
  "line": { "style": "solid" },
  "numbered": { "number": 1, "label": "Checkpoint" },
  "spacer": { "size": "medium" },
  "continue button": { "label": "Continue" }
}
```

## Multimedia Payloads

Embed URLs must start with one of the exported `embedAllowlist` prefixes.

```json
{
  "video": {
    "mediaId": "video_intro",
    "posterMediaId": "image_video_poster",
    "captions": [
      {
        "id": "caption_en",
        "mediaId": "captions_en",
        "srclang": "en",
        "label": "English",
        "default": true
      }
    ],
    "transcript": "<p>Transcript text.</p>"
  },
  "embed": {
    "url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "title": "Training embed",
    "allowFullscreen": true,
    "aspectRatio": "16:9"
  },
  "attachment": {
    "mediaId": "attachment_policy",
    "label": "Download policy",
    "sizeBytes": 2048
  },
  "code": {
    "language": "json",
    "code": "{ \"answer\": true }",
    "showLineNumbers": true,
    "copyButton": true
  }
}
```

## Interactive Payloads

Variants `accordion` and `tabs` share this payload.

```json
{
  "items": [
    {
      "id": "tab_01",
      "title": "Tab one",
      "html": "<p>Panel content.</p>",
      "imageMediaId": "image_gallery_01"
    }
  ]
}
```

## Interactive Fullscreen Payloads

```json
{
  "process": {
    "intro": "<p>Intro copy.</p>",
    "steps": [
      { "id": "step_01", "title": "Prepare", "html": "<p>Prepare.</p>" }
    ],
    "summary": "<p>Summary copy.</p>"
  },
  "labeled graphic": {
    "image": { "mediaId": "image_labeled", "alt": "Diagram alt text" },
    "markers": [
      {
        "id": "marker_01",
        "x": 35,
        "y": 45,
        "title": "Marker",
        "html": "<p>Marker detail.</p>"
      }
    ]
  },
  "timeline": {
    "events": [
      {
        "id": "event_01",
        "date": "Week 1",
        "title": "Kickoff",
        "html": "<p>Event detail.</p>"
      }
    ]
  },
  "sorting": {
    "piles": [
      { "id": "pile_do", "label": "Do" },
      { "id": "pile_avoid", "label": "Avoid" }
    ],
    "items": [
      {
        "id": "sort_01",
        "label": "Validate input",
        "correctPileId": "pile_do",
        "feedback": "Good placement."
      }
    ]
  }
}
```

## Flashcard Payloads

Variants `single card`, `grid`, and `stack` share this payload.

```json
{
  "cards": [
    {
      "id": "card_01",
      "front": { "kind": "text", "html": "<p>Front text.</p>" },
      "back": { "kind": "image", "mediaId": "image_gallery_01", "alt": "Back image" }
    }
  ]
}
```

## Button Payloads

Variants `single button` and `button stack` share this payload.

```json
{
  "buttons": [
    {
      "id": "button_01",
      "label": "Visit example",
      "destination": { "type": "url", "url": "https://example.com" }
    },
    {
      "id": "button_02",
      "label": "Go to quiz",
      "destination": { "type": "lesson", "lessonId": "quiz_final" }
    }
  ]
}
```

## Knowledge Check Payloads

```json
{
  "multiple choice": {
    "prompt": "<p>Choose one.</p>",
    "answers": [
      { "id": "answer_a", "html": "<p>Correct</p>", "correct": true },
      { "id": "answer_b", "html": "<p>Incorrect</p>", "correct": false }
    ],
    "correctFeedback": "<p>Correct.</p>",
    "incorrectFeedback": "<p>Try again.</p>"
  },
  "multiple response": {
    "prompt": "<p>Choose all that apply.</p>",
    "answers": [
      { "id": "answer_a", "html": "<p>Correct</p>", "correct": true },
      { "id": "answer_b", "html": "<p>Also correct</p>", "correct": true },
      { "id": "answer_c", "html": "<p>Incorrect</p>", "correct": false }
    ],
    "correctFeedback": "<p>Correct.</p>",
    "incorrectFeedback": "<p>Try again.</p>"
  },
  "fill in the blank": {
    "prompt": "<p>Forge uses ____.</p>",
    "acceptedAnswers": [{ "id": "accepted_01", "value": "xAPI" }],
    "caseSensitive": false,
    "correctFeedback": "<p>Correct.</p>",
    "incorrectFeedback": "<p>The answer is xAPI.</p>"
  },
  "matching": {
    "prompt": "<p>Match each item.</p>",
    "pairs": [{ "id": "pair_01", "prompt": "State API", "match": "Resume data" }],
    "correctFeedback": "<p>Matched.</p>",
    "incorrectFeedback": "<p>Review and try again.</p>"
  }
}
```

## Chart Payloads

Variants `bar`, `line`, and `pie` share item structure. `line` may include `curveType`.

```json
{
  "title": "Score trend",
  "items": [
    { "id": "point_01", "label": "Attempt 1", "value": 50, "color": "#1f6feb" },
    { "id": "point_02", "label": "Attempt 2", "value": 75 }
  ],
  "xAxisLabel": "Attempt",
  "yAxisLabel": "Score",
  "curveType": "monotone"
}
```

## Table Payloads

Variants `basic` and `header row/col options` share this payload.

```json
{
  "caption": "Results",
  "headerRow": true,
  "headerColumn": true,
  "columns": [
    { "id": "column_metric", "html": "<p>Metric</p>" },
    { "id": "column_value", "html": "<p>Value</p>" }
  ],
  "rows": [
    {
      "id": "row_01",
      "cells": [
        {
          "id": "cell_01",
          "columnId": "column_metric",
          "html": "<p>Pass rate</p>"
        },
        {
          "id": "cell_02",
          "columnId": "column_value",
          "html": "<p>95%</p>"
        }
      ]
    }
  ]
}
```

## Audio Payload

```json
{
  "mediaId": "audio_narration",
  "title": "Narration",
  "transcript": "<p>Transcript text.</p>"
}
```

## Callout Payloads

Variants `info`, `warning`, `success`, and `danger` share this payload.

```json
{
  "title": "Warning",
  "html": "<p>Pay attention before continuing.</p>",
  "icon": "triangle-alert"
}
```

## Scenario Payload

```json
{
  "startSceneId": "scene_01",
  "scenes": [
    {
      "id": "scene_01",
      "prompt": "<p>A learner asks for help. What do you do?</p>",
      "choices": [
        {
          "id": "choice_help",
          "label": "Offer guidance",
          "feedback": "<p>Good response.</p>",
          "nextSceneId": "scene_02"
        }
      ]
    },
    {
      "id": "scene_02",
      "prompt": "<p>The learner needs a resource.</p>",
      "choices": [
        {
          "id": "choice_resource",
          "label": "Share the resource",
          "endsScenario": true
        }
      ]
    }
  ]
}
```

## Checklist Payload

```json
{
  "requiredForCompletion": true,
  "items": [
    { "id": "task_01", "html": "<p>Read the policy.</p>" },
    { "id": "task_02", "html": "<p>Complete the quiz.</p>", "initiallyChecked": false }
  ]
}
```

## Quiz Question Payloads

```json
{
  "multipleChoice": {
    "id": "question_mc",
    "type": "MULTIPLE_CHOICE",
    "prompt": "<p>Choose one.</p>",
    "answers": [
      { "id": "mc_a", "html": "<p>Correct</p>", "correct": true },
      { "id": "mc_b", "html": "<p>Incorrect</p>", "correct": false }
    ]
  },
  "multipleResponse": {
    "id": "question_mr",
    "type": "MULTIPLE_RESPONSE",
    "prompt": "<p>Choose all that apply.</p>",
    "answers": [
      { "id": "mr_a", "html": "<p>Correct</p>", "correct": true },
      { "id": "mr_b", "html": "<p>Incorrect</p>", "correct": false }
    ]
  },
  "fillInTheBlank": {
    "id": "question_fib",
    "type": "FILL_IN_THE_BLANK",
    "prompt": "<p>Fill the blank.</p>",
    "acceptedAnswers": [{ "id": "fib_a", "value": "xAPI" }],
    "caseSensitive": false
  },
  "matching": {
    "id": "question_matching",
    "type": "MATCHING",
    "prompt": "<p>Match items.</p>",
    "pairs": [{ "id": "match_a", "prompt": "Course", "match": "Top-level activity" }]
  },
  "sequencing": {
    "id": "question_sequence",
    "type": "SEQUENCING",
    "prompt": "<p>Order the steps.</p>",
    "items": [
      { "id": "seq_a", "html": "<p>First</p>", "correctOrder": 0 },
      { "id": "seq_b", "html": "<p>Second</p>", "correctOrder": 1 }
    ]
  },
  "numeric": {
    "id": "question_numeric",
    "type": "NUMERIC",
    "prompt": "<p>Enter the threshold.</p>",
    "grading": { "mode": "exact", "value": 100, "tolerance": 0 }
  },
  "likert": {
    "id": "question_likert",
    "type": "LIKERT",
    "prompt": "<p>This was useful.</p>",
    "scale": [
      { "id": "likert_1", "label": "Disagree", "value": 1 },
      { "id": "likert_2", "label": "Agree", "value": 2 }
    ],
    "required": false
  }
}
```

## Publish Settings

```json
{
  "tracking": { "mode": "courseCompletion", "requiredLessonPercent": 100 },
  "reportingMode": "passed-incomplete",
  "exitCourseLink": true,
  "hideCoverPage": false,
  "strictLaunch": false,
  "statementProfile": "forge-v1"
}
```

## State API Envelope

```json
{
  "schemaVersion": "1.0.0",
  "activityId": "https://xapi.supercell.com/courses/01JZ9S99Z8A0Y4Y6RAZ76D9M7F",
  "courseId": "01JZ9S99Z8A0Y4Y6RAZ76D9M7F",
  "registration": "8f315f56-4a72-49a1-b20c-0f817f4bdbfd",
  "updatedAt": "2026-07-04T10:00:00.000Z",
  "state": {
    "bookmark": {
      "lessonId": "lesson_blocks",
      "blockId": "block_text_paragraph",
      "scrollAnchor": "block_text_paragraph"
    },
    "progress": {
      "lessons": {
        "lesson_blocks": {
          "completed": false,
          "percentComplete": 20,
          "blockCount": 4,
          "consumedBlockBitset": "1000"
        }
      }
    },
    "quiz": {},
    "interactions": {}
  }
}
```

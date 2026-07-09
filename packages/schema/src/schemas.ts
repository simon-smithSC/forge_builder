import { z } from "zod";
import {
  embedAllowlist,
  embedAllowlistPattern,
  isSafeHtmlFragment,
  safeHtmlFragmentPattern,
} from "./sanitizer.js";
import { ULID_PATTERN } from "./ulid.js";

export const CURRENT_SCHEMA_VERSION = "1.3.0";

const idSchema = z.string().min(1);
export const ulidSchema = z.string().regex(new RegExp(ULID_PATTERN), {
  message: "Expected a ULID.",
});
const mediaIdSchema = idSchema;
const htmlFragmentSchema = z
  .string()
  .min(1)
  .regex(new RegExp(safeHtmlFragmentPattern), {
    message: "HTML fragment contains unsafe tags, attributes, or URL schemes.",
  })
  .refine(isSafeHtmlFragment, {
    message:
      "HTML fragment contains tags, attributes, or URL schemes outside the sanitizer policy.",
  })
  .describe("forge:sanitized-html-fragment");
const isoDateTimeSchema = z.string().datetime({ offset: true });
const colorSchema = z
  .string()
  .regex(/^(#[0-9a-fA-F]{3,8}|var\(--[a-zA-Z0-9-]+\))$/);
const bcp47LocalePattern =
  "^[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|\\d{3}))?(?:-(?:[A-Za-z0-9]{5,8}|\\d[A-Za-z0-9]{3}))*?(?:-[A-WY-Za-wy-z0-9](?:-[A-Za-z0-9]{2,8})+)*(?:-x(?:-[A-Za-z0-9]{1,8})+)?$";

const isBcp47Locale = (value: string): boolean => {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
};

export const bcp47LocaleSchema = z
  .string()
  .regex(new RegExp(bcp47LocalePattern), {
    message: "Expected a structurally valid BCP 47 locale.",
  })
  .refine(isBcp47Locale, {
    message: "Expected a BCP 47 locale.",
  });

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const blockFamilyVariants = {
  text: [
    "paragraph",
    "heading",
    "subheading",
    "heading+paragraph",
    "subheading+paragraph",
    "two column",
  ],
  impact: ["a", "b", "c", "d", "note"],
  list: ["bulleted", "numbered", "checkboxes"],
  image: ["hero", "full width", "centered", "text aside", "banner"],
  gallery: [
    "carousel (centered)",
    "two column grid",
    "three column grid",
    "four column grid",
  ],
  divider: ["line", "numbered", "spacer", "continue button", "screen bar"],
  multimedia: ["video", "embed", "attachment", "code"],
  interactive: ["accordion", "tabs"],
  "interactive-fullscreen": ["process", "labeled graphic", "timeline", "sorting"],
  flashcard: ["single card", "grid", "stack"],
  buttons: ["single button", "button stack"],
  knowledgeCheck: [
    "multiple choice",
    "multiple response",
    "fill in the blank",
    "matching",
  ],
  chart: ["bar", "line", "pie"],
  table: ["basic", "header row/col options"],
  audio: ["standalone audio"],
  callout: ["info", "warning", "success", "danger"],
  scenario: ["branching scene"],
  checklist: ["task checklist"],
} as const;

export type BlockFamily = keyof typeof blockFamilyVariants;

const blockFamilyNames = Object.keys(blockFamilyVariants) as [
  BlockFamily,
  ...BlockFamily[],
];

export const blockFamilySchema = z.enum(blockFamilyNames);

const textParagraphPayloadSchema = z
  .object({
    html: htmlFragmentSchema,
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const textHeadingPayloadSchema = z
  .object({
    heading: htmlFragmentSchema,
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const textSubheadingPayloadSchema = z
  .object({
    subheading: htmlFragmentSchema,
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const textHeadingParagraphPayloadSchema = z
  .object({
    heading: htmlFragmentSchema,
    html: htmlFragmentSchema,
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const textSubheadingParagraphPayloadSchema = z
  .object({
    subheading: htmlFragmentSchema,
    html: htmlFragmentSchema,
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const textTwoColumnPayloadSchema = z
  .object({
    columns: z
      .array(
        z
          .object({
            id: idSchema,
            html: htmlFragmentSchema,
          })
          .strict(),
      )
      .length(2),
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const impactPayloadSchema = z
  .object({
    html: htmlFragmentSchema,
    attribution: z.string().min(1).optional(),
  })
  .strict();

const listPayloadSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: idSchema,
            html: htmlFragmentSchema,
            checked: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const imagePayloadSchema = z
  .object({
    mediaId: mediaIdSchema,
    alt: z.string().min(1),
    caption: z.string().optional(),
    zoomOnClick: z.boolean(),
    text: htmlFragmentSchema.optional(),
  })
  .strict();

const galleryPayloadSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: idSchema,
            mediaId: mediaIdSchema,
            alt: z.string().min(1),
            caption: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const dividerLinePayloadSchema = z
  .object({
    style: z.enum(["solid", "dashed", "dotted"]),
  })
  .strict();

const dividerNumberedPayloadSchema = z
  .object({
    number: z.number().int().positive(),
    label: z.string().min(1).optional(),
  })
  .strict();

const dividerSpacerPayloadSchema = z
  .object({
    size: z.enum(["small", "medium", "large"]),
  })
  .strict();

const dividerContinuePayloadSchema = z
  .object({
    label: z.string().min(1),
  })
  .strict();

// Screen bar (v1.3.0): an empty full-bleed band — spacing comes from the
// block's padding envelope, background from block settings. No payload knobs.
const dividerScreenBarPayloadSchema = z.object({}).strict();

const videoPayloadSchema = z
  .object({
    mediaId: mediaIdSchema,
    posterMediaId: mediaIdSchema.optional(),
    captions: z
      .array(
        z
          .object({
            id: idSchema,
            mediaId: mediaIdSchema,
            srclang: z.string().min(2),
            label: z.string().min(1),
            default: z.boolean().optional(),
          })
          .strict(),
      )
      .default([]),
    transcript: htmlFragmentSchema.optional(),
  })
  .strict();

const embedPayloadSchema = z
  .object({
    url: z
      .string()
      .url()
      .regex(new RegExp(embedAllowlistPattern), {
        message: "Embed URL is not in the Forge allowlist.",
      })
      .refine(
        (value) =>
          embedAllowlist.some((allowedPrefix) => value.startsWith(allowedPrefix)),
        {
          message: "Embed URL is not in the Forge allowlist.",
        },
      ),
    title: z.string().min(1),
    allowFullscreen: z.boolean(),
    aspectRatio: z.enum(["16:9", "4:3", "1:1"]),
  })
  .strict();

const attachmentPayloadSchema = z
  .object({
    mediaId: mediaIdSchema,
    label: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
  })
  .strict();

const codePayloadSchema = z
  .object({
    language: z.string().min(1),
    code: z.string().min(1),
    showLineNumbers: z.boolean(),
    copyButton: z.boolean(),
  })
  .strict();

const interactiveItemSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1),
    html: htmlFragmentSchema,
    imageMediaId: mediaIdSchema.optional(),
    audioMediaId: mediaIdSchema.optional(),
  })
  .strict();

const interactivePayloadSchema = z
  .object({
    items: z.array(interactiveItemSchema).min(1),
  })
  .strict();

const processPayloadSchema = z
  .object({
    intro: htmlFragmentSchema,
    steps: z
      .array(
        z
          .object({
            id: idSchema,
            title: z.string().min(1),
            html: htmlFragmentSchema,
            imageMediaId: mediaIdSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    summary: htmlFragmentSchema.optional(),
  })
  .strict();

const labeledGraphicPayloadSchema = z
  .object({
    image: z
      .object({
        mediaId: mediaIdSchema,
        alt: z.string().min(1),
      })
      .strict(),
    markers: z
      .array(
        z
          .object({
            id: idSchema,
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            title: z.string().min(1),
            html: htmlFragmentSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const timelinePayloadSchema = z
  .object({
    events: z
      .array(
        z
          .object({
            id: idSchema,
            // v1.3.0: eyebrow renamed date -> label and made optional so
            // non-temporal timelines can omit it (migrate120To130).
            label: z.string().min(1).optional(),
            title: z.string().min(1),
            html: htmlFragmentSchema,
            mediaId: mediaIdSchema.optional(),
            // v1.3.0: render this event open initially (still toggleable).
            startExpanded: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
    // v1.3.0: plain headings, all bodies visible, no toggling at all.
    detailsAlwaysVisible: z.boolean().optional(),
  })
  .strict();

const sortingPayloadSchema = z
  .object({
    piles: z
      .array(
        z
          .object({
            id: idSchema,
            label: z.string().min(1),
          })
          .strict(),
      )
      .min(2),
    items: z
      .array(
        z
          .object({
            id: idSchema,
            label: z.string().min(1),
            correctPileId: idSchema,
            feedback: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const flashcardSideSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("text"),
      html: htmlFragmentSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("image"),
      mediaId: mediaIdSchema,
      alt: z.string().min(1),
    })
    .strict(),
]);

const flashcardPayloadSchema = z
  .object({
    cards: z
      .array(
        z
          .object({
            id: idSchema,
            front: flashcardSideSchema,
            back: flashcardSideSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const buttonDestinationSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("url"),
      url: z.string().url(),
    })
    .strict(),
  z
    .object({
      type: z.literal("lesson"),
      lessonId: idSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("mailto"),
      email: z.string().email(),
      subject: z.string().optional(),
    })
    .strict(),
]);

const buttonsPayloadSchema = z
  .object({
    buttons: z
      .array(
        z
          .object({
            id: idSchema,
            label: z.string().min(1),
            title: htmlFragmentSchema.optional(),
            description: htmlFragmentSchema.optional(),
            destination: buttonDestinationSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const feedbackPairSchema = z
  .object({
    correctFeedback: htmlFragmentSchema,
    incorrectFeedback: htmlFragmentSchema,
    rationale: htmlFragmentSchema.optional(),
  })
  .strict();

const choiceAnswerSchema = z
  .object({
    id: idSchema,
    html: htmlFragmentSchema,
    correct: z.boolean(),
    feedback: htmlFragmentSchema.optional(),
  })
  .strict();

const knowledgeChoicePayloadSchema = feedbackPairSchema
  .extend({
    prompt: htmlFragmentSchema,
    answers: z.array(choiceAnswerSchema).min(2),
  })
  .strict();

const knowledgeFillBlankPayloadSchema = feedbackPairSchema
  .extend({
    prompt: htmlFragmentSchema,
    acceptedAnswers: z
      .array(
        z
          .object({
            id: idSchema,
            value: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    caseSensitive: z.boolean(),
  })
  .strict();

const knowledgeMatchingPayloadSchema = feedbackPairSchema
  .extend({
    prompt: htmlFragmentSchema,
    pairs: z
      .array(
        z
          .object({
            id: idSchema,
            prompt: z.string().min(1),
            match: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const chartPayloadSchema = z
  .object({
    title: z.string().optional(),
    items: z
      .array(
        z
          .object({
            id: idSchema,
            label: z.string().min(1),
            value: z.number(),
            color: colorSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    xAxisLabel: z.string().optional(),
    yAxisLabel: z.string().optional(),
    curveType: z.enum(["linear", "monotone", "step"]).optional(),
  })
  .strict();

const tableCellSchema = z
  .object({
    id: idSchema,
    columnId: idSchema,
    html: htmlFragmentSchema,
  })
  .strict();

const tableColumnSchema = z
  .object({
    id: idSchema,
    html: htmlFragmentSchema,
  })
  .strict();

const tablePayloadSchema = z
  .object({
    caption: z.string().optional(),
    headerRow: z.boolean(),
    headerColumn: z.boolean(),
    columns: z.array(tableColumnSchema).min(1),
    rows: z
      .array(
        z
          .object({
            id: idSchema,
            cells: z.array(tableCellSchema).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((table, ctx) => {
    const columnIds = new Set(table.columns.map((column) => column.id));
    for (const [rowIndex, row] of table.rows.entries()) {
      for (const [cellIndex, cell] of row.cells.entries()) {
        if (!columnIds.has(cell.columnId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rows", rowIndex, "cells", cellIndex, "columnId"],
            message: `Unknown table column id: ${cell.columnId}`,
          });
        }
      }
    }
  });

const audioPayloadSchema = z
  .object({
    mediaId: mediaIdSchema,
    title: z.string().optional(),
    transcript: htmlFragmentSchema,
  })
  .strict();

const calloutPayloadSchema = z
  .object({
    title: z.string().optional(),
    html: htmlFragmentSchema,
    icon: z.string().optional(),
  })
  .strict();

const scenarioPayloadSchema = z
  .object({
    startSceneId: idSchema,
    scenes: z
      .array(
        z
          .object({
            id: idSchema,
            prompt: htmlFragmentSchema,
            mediaId: mediaIdSchema.optional(),
            choices: z
              .array(
                z
                  .object({
                    id: idSchema,
                    label: z.string().min(1),
                    feedback: htmlFragmentSchema.optional(),
                    nextSceneId: idSchema.optional(),
                    endsScenario: z.boolean().optional(),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const checklistPayloadSchema = z
  .object({
    requiredForCompletion: z.boolean(),
    items: z
      .array(
        z
          .object({
            id: idSchema,
            html: htmlFragmentSchema,
            initiallyChecked: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const blockPayloadSchemas = {
  text: {
    paragraph: textParagraphPayloadSchema,
    heading: textHeadingPayloadSchema,
    subheading: textSubheadingPayloadSchema,
    "heading+paragraph": textHeadingParagraphPayloadSchema,
    "subheading+paragraph": textSubheadingParagraphPayloadSchema,
    "two column": textTwoColumnPayloadSchema,
  },
  impact: {
    a: impactPayloadSchema,
    b: impactPayloadSchema,
    c: impactPayloadSchema,
    d: impactPayloadSchema,
    note: impactPayloadSchema,
  },
  list: {
    bulleted: listPayloadSchema,
    numbered: listPayloadSchema,
    checkboxes: listPayloadSchema,
  },
  image: {
    hero: imagePayloadSchema,
    "full width": imagePayloadSchema,
    centered: imagePayloadSchema,
    "text aside": imagePayloadSchema,
    banner: imagePayloadSchema,
  },
  gallery: {
    "carousel (centered)": galleryPayloadSchema,
    "two column grid": galleryPayloadSchema,
    "three column grid": galleryPayloadSchema,
    "four column grid": galleryPayloadSchema,
  },
  divider: {
    line: dividerLinePayloadSchema,
    numbered: dividerNumberedPayloadSchema,
    spacer: dividerSpacerPayloadSchema,
    "continue button": dividerContinuePayloadSchema,
    "screen bar": dividerScreenBarPayloadSchema,
  },
  multimedia: {
    video: videoPayloadSchema,
    embed: embedPayloadSchema,
    attachment: attachmentPayloadSchema,
    code: codePayloadSchema,
  },
  interactive: {
    accordion: interactivePayloadSchema,
    tabs: interactivePayloadSchema,
  },
  "interactive-fullscreen": {
    process: processPayloadSchema,
    "labeled graphic": labeledGraphicPayloadSchema,
    timeline: timelinePayloadSchema,
    sorting: sortingPayloadSchema,
  },
  flashcard: {
    "single card": flashcardPayloadSchema,
    grid: flashcardPayloadSchema,
    stack: flashcardPayloadSchema,
  },
  buttons: {
    "single button": buttonsPayloadSchema,
    "button stack": buttonsPayloadSchema,
  },
  knowledgeCheck: {
    "multiple choice": knowledgeChoicePayloadSchema,
    "multiple response": knowledgeChoicePayloadSchema,
    "fill in the blank": knowledgeFillBlankPayloadSchema,
    matching: knowledgeMatchingPayloadSchema,
  },
  chart: {
    bar: chartPayloadSchema,
    line: chartPayloadSchema,
    pie: chartPayloadSchema,
  },
  table: {
    basic: tablePayloadSchema,
    "header row/col options": tablePayloadSchema,
  },
  audio: {
    "standalone audio": audioPayloadSchema,
  },
  callout: {
    info: calloutPayloadSchema,
    warning: calloutPayloadSchema,
    success: calloutPayloadSchema,
    danger: calloutPayloadSchema,
  },
  scenario: {
    "branching scene": scenarioPayloadSchema,
  },
  checklist: {
    "task checklist": checklistPayloadSchema,
  },
} satisfies {
  [Family in BlockFamily]: {
    [Variant in (typeof blockFamilyVariants)[Family][number]]: z.ZodTypeAny;
  };
};

type PayloadRegistry = typeof blockPayloadSchemas;
type BlockPayloadSchema = {
  [Family in keyof PayloadRegistry]: PayloadRegistry[Family][keyof PayloadRegistry[Family]];
}[keyof PayloadRegistry];

export type BlockPayload = z.infer<BlockPayloadSchema>;
export type BlockVariantForFamily<Family extends BlockFamily> =
  keyof PayloadRegistry[Family] & string;
type PayloadSchemaFor<
  Family extends BlockFamily,
  Variant extends BlockVariantForFamily<Family>,
> = PayloadRegistry[Family][Variant] extends z.ZodTypeAny
  ? PayloadRegistry[Family][Variant]
  : never;

export const textColorModeSchema = z.union([
  z.literal("auto"),
  z
    .object({
      mode: z.literal("explicit"),
      color: colorSchema,
    })
    .strict(),
]);

export const blockSettingsSchema = z
  .object({
    paddingTop: z.number().int().min(0).max(5),
    paddingBottom: z.number().int().min(0).max(5),
    backgroundColor: colorSchema.optional(),
    textColorMode: textColorModeSchema,
    entranceAnimation: z.enum(["inherit", "none", "fade", "slide", "zoom"]).optional(),
    anchorId: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/).optional(),
  })
  .strict();

export const visibilityRuleSchema = z
  .object({
    sourceId: idSchema,
    operator: z.enum(["equals", "notEquals", "contains", "completed", "answered"]),
    value: jsonValueSchema.optional(),
  })
  .strict();

const blockBaseSchema = z
  .object({
    id: idSchema,
    family: blockFamilySchema,
    variant: z.string().min(1),
    payload: z.unknown(),
    settings: blockSettingsSchema,
    visibility: visibilityRuleSchema.optional(),
    notes: z.string().optional(),
  })
  .strict();

export interface BlockEnvelope<
  Family extends BlockFamily,
  Variant extends BlockVariantForFamily<Family>,
  TPayload,
> {
  id: string;
  family: Family;
  variant: Variant;
  payload: TPayload;
  settings: BlockSettings;
  visibility?: VisibilityRule;
  notes?: string;
}

export type BlockSettings = z.infer<typeof blockSettingsSchema>;
export type VisibilityRule = z.infer<typeof visibilityRuleSchema>;
export type BlockFor<
  Family extends BlockFamily,
  Variant extends BlockVariantForFamily<Family>,
> = BlockEnvelope<Family, Variant, z.infer<PayloadSchemaFor<Family, Variant>>>;

export type Block = {
  [Family in BlockFamily]: {
    [Variant in BlockVariantForFamily<Family>]: BlockFor<Family, Variant>;
  }[BlockVariantForFamily<Family>];
}[BlockFamily];

const blockVariantSchemaArray = Object.entries(blockPayloadSchemas).flatMap(
  ([family, variants]) =>
    Object.entries(variants).map(([variant, payloadSchema]) =>
      blockBaseSchema.extend({
        family: z.literal(family as BlockFamily),
        variant: z.literal(variant),
        payload: payloadSchema,
      }),
    ),
);

const asZodUnionTuple = (
  schemas: z.ZodTypeAny[],
): [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]] => {
  const first = schemas[0];
  const second = schemas[1];
  if (!first || !second) {
    throw new Error("At least two block schemas are required.");
  }
  return [first, second, ...schemas.slice(2)];
};

const blockVariantSchemas = asZodUnionTuple(blockVariantSchemaArray);

export const blockSchema: z.ZodType<Block> = z.union(
  blockVariantSchemas,
) as z.ZodType<Block>;

const questionBaseSchema = z
  .object({
    id: idSchema,
    prompt: htmlFragmentSchema,
    mediaId: mediaIdSchema.optional(),
    points: z.number().nonnegative().optional(),
    rationale: htmlFragmentSchema.optional(),
  })
  .strict();

const surveyQuestionBaseSchema = questionBaseSchema.omit({ points: true });

const questionFeedbackSchema = z
  .object({
    correct: htmlFragmentSchema.optional(),
    incorrect: htmlFragmentSchema.optional(),
  })
  .strict();

const quizChoiceAnswerSchema = z
  .object({
    id: idSchema,
    html: htmlFragmentSchema,
    correct: z.boolean(),
    feedback: htmlFragmentSchema.optional(),
  })
  .strict();

const multipleChoiceQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("MULTIPLE_CHOICE"),
    answers: z.array(quizChoiceAnswerSchema).min(2),
    feedback: questionFeedbackSchema.optional(),
  })
  .strict();

const multipleResponseQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("MULTIPLE_RESPONSE"),
    answers: z.array(quizChoiceAnswerSchema).min(2),
    feedback: questionFeedbackSchema.optional(),
  })
  .strict();

const fillInBlankQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("FILL_IN_THE_BLANK"),
    acceptedAnswers: z
      .array(
        z
          .object({
            id: idSchema,
            value: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    caseSensitive: z.boolean(),
    feedback: questionFeedbackSchema.optional(),
  })
  .strict();

const matchingQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("MATCHING"),
    pairs: z
      .array(
        z
          .object({
            id: idSchema,
            prompt: z.string().min(1),
            match: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    feedback: questionFeedbackSchema.optional(),
  })
  .strict();

const sequencingQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("SEQUENCING"),
    items: z
      .array(
        z
          .object({
            id: idSchema,
            html: htmlFragmentSchema,
            correctOrder: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(2),
    feedback: questionFeedbackSchema.optional(),
  })
  .strict();

const numericQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("NUMERIC"),
    grading: z.discriminatedUnion("mode", [
      z
        .object({
          mode: z.literal("exact"),
          value: z.number(),
          tolerance: z.number().nonnegative().optional(),
        })
        .strict(),
      z
        .object({
          mode: z.literal("range"),
          min: z.number(),
          max: z.number(),
        })
        .strict(),
    ]),
    feedback: questionFeedbackSchema.optional(),
  })
  .strict();

const likertQuestionSchema = surveyQuestionBaseSchema
  .extend({
    type: z.literal("LIKERT"),
    scale: z
      .array(
        z
          .object({
            id: idSchema,
            label: z.string().min(1),
            value: z.number(),
          })
          .strict(),
      )
      .min(2),
    required: z.boolean(),
  })
  .strict();

export const questionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  multipleResponseQuestionSchema,
  fillInBlankQuestionSchema,
  matchingQuestionSchema,
  sequencingQuestionSchema,
  numericQuestionSchema,
  likertQuestionSchema,
]);

export type Question = z.infer<typeof questionSchema>;

export const themeSchema = z
  .object({
    primaryColor: colorSchema,
    backgroundColor: colorSchema,
    surfaceColor: colorSchema,
    textColor: colorSchema,
    accentColor: colorSchema,
    headingTypeface: z.string().min(1),
    bodyTypeface: z.string().min(1),
    uiTypeface: z.string().min(1),
    spacingScale: z.enum(["compact", "comfortable", "spacious"]),
    logoMediaId: mediaIdSchema.optional(),
  })
  .strict();

export type Theme = z.infer<typeof themeSchema>;

export const labelSetSchema = z
  .object({
    startCourse: z.string().min(1),
    resumeCourse: z.string().min(1),
    continue: z.string().min(1),
    submit: z.string().min(1),
    correct: z.string().min(1),
    incorrect: z.string().min(1),
    retry: z.string().min(1),
    revealAnswer: z.string().min(1),
    nextLesson: z.string().min(1),
    previousLesson: z.string().min(1),
    exitCourse: z.string().min(1),
    complete: z.string().min(1),
    passed: z.string().min(1),
    failed: z.string().min(1),
    searchPlaceholder: z.string().min(1),
    translations: z.record(z.record(z.string())).optional(),
  })
  .strict();

export type LabelSet = z.infer<typeof labelSetSchema>;

export const courseSettingsSchema = z
  .object({
    navigationMode: z.enum(["free", "sequential"]),
    sidebar: z
      .object({
        enabled: z.boolean(),
        defaultOpen: z.boolean(),
      })
      .strict(),
    searchEnabled: z.boolean(),
    showLessonCount: z.boolean(),
    blockEntranceAnimation: z.enum(["none", "fade", "slide", "zoom"]),
    videoPlaybackSpeedControl: z.boolean(),
  })
  .strict();

export type CourseSettings = z.infer<typeof courseSettingsSchema>;

export const mediaRefSchema = z
  .object({
    id: idSchema,
    kind: z.enum(["image", "video", "audio", "attachment", "captions"]),
    filename: z.string().min(1),
    mime: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    durationSeconds: z.number().nonnegative().optional(),
    alt: z.string().optional(),
    storageKey: z.string().min(1),
    derived: z
      .object({
        thumbKey: z.string().min(1).optional(),
        posterKey: z.string().min(1).optional(),
        renditions: z
          .array(
            z
              .object({
                width: z.number().int().positive(),
                height: z.number().int().positive(),
                storageKey: z.string().min(1),
                bytes: z.number().int().nonnegative(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type MediaRef = z.infer<typeof mediaRefSchema>;

const sectionHeaderSchema = z
  .object({
    type: z.literal("section"),
    id: idSchema,
    title: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

/** Course title screen background (v1.2.0): "cover" paints the full cover
 *  screen behind a scrim; "hero" renders the image above the title. Mirrors
 *  Rise's coverPageType + coverImageAlpha. */
export const courseCoverSchema = z
  .object({
    mediaId: mediaIdSchema,
    layout: z.enum(["cover", "hero"]),
    overlayOpacity: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type CourseCover = z.infer<typeof courseCoverSchema>;

/** Lesson header band styling (v1.2.0). Replaces the bare `headerImage`
 *  media id; migration 1.1.0 -> 1.2.0 moves it into `imageMediaId`. */
export const lessonHeaderSchema = z
  .object({
    imageMediaId: mediaIdSchema.optional(),
    backgroundColor: colorSchema.optional(),
    overlayOpacity: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type LessonHeader = z.infer<typeof lessonHeaderSchema>;

const blocksLessonSchema = z
  .object({
    type: z.literal("blocks"),
    id: idSchema,
    title: z.string().min(1),
    icon: z.string().optional(),
    header: lessonHeaderSchema.optional(),
    blocks: z.array(blockSchema),
  })
  .strict();

export const quizLessonSettingsSchema = z
  .object({
    passingScore: z.number().min(0).max(100),
    retryCount: z.number().int().min(-1),
    revealAnswers: z.enum(["all", "none", "afterFinalAttempt"]),
    shuffleAnswerChoices: z.boolean(),
    randomizeQuestionOrder: z.boolean(),
    questionPoolSize: z.number().int().positive().optional(),
    timeLimitSeconds: z.number().int().positive().optional(),
  })
  .strict();

const quizLessonSchema = z
  .object({
    type: z.literal("quiz"),
    id: idSchema,
    title: z.string().min(1),
    settings: quizLessonSettingsSchema,
    questions: z.array(questionSchema).min(1),
  })
  .strict();

export const lessonSchema = z.discriminatedUnion("type", [
  sectionHeaderSchema,
  blocksLessonSchema,
  quizLessonSchema,
]);

export type SectionHeader = z.infer<typeof sectionHeaderSchema>;
export type BlocksLesson = Omit<z.infer<typeof blocksLessonSchema>, "blocks"> & {
  blocks: Block[];
};
export type QuizLesson = z.infer<typeof quizLessonSchema>;
export type Lesson = SectionHeader | BlocksLesson | QuizLesson;

export const courseDocSchema = z
  .object({
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
    id: ulidSchema,
    title: z.string().min(1),
    description: z.string(),
    // Rich projection of `description`; the plain string stays canonical
    // (it feeds tincan.xml) and the editor keeps both in sync on commit.
    descriptionHtml: htmlFragmentSchema.optional(),
    author: z.string().min(1).optional(),
    cover: courseCoverSchema.optional(),
    defaultLocale: bcp47LocaleSchema,
    theme: themeSchema,
    labelSet: labelSetSchema,
    settings: courseSettingsSchema,
    lessons: z.array(lessonSchema),
    media: z.record(mediaRefSchema),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export type CourseDoc = Omit<z.infer<typeof courseDocSchema>, "lessons"> & {
  lessons: Lesson[];
};

export const publishSettingsSchema = z
  .object({
    tracking: z.discriminatedUnion("mode", [
      z
        .object({
          mode: z.literal("courseCompletion"),
          requiredLessonPercent: z.number().min(0).max(100),
        })
        .strict(),
      z
        .object({
          mode: z.literal("quizResult"),
          quizLessonId: idSchema,
        })
        .strict(),
    ]),
    reportingMode: z.enum([
      "passed-incomplete",
      "passed-failed",
      "completed-incomplete",
      "completed-failed",
    ]),
    exitCourseLink: z.boolean(),
    hideCoverPage: z.boolean(),
    strictLaunch: z.boolean(),
    statementProfile: z.enum(["forge-v1", "rise-compat"]),
  })
  .strict();

export type PublishSettings = z.infer<typeof publishSettingsSchema>;

export const stateDocumentEnvelopeSchema = z
  .object({
    schemaVersion: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
    activityId: z.string().url(),
    courseId: idSchema,
    registration: z.string().uuid().optional(),
    updatedAt: isoDateTimeSchema,
    state: z
      .object({
        bookmark: z
          .object({
            lessonId: idSchema,
            blockId: idSchema.optional(),
            scrollAnchor: z.string().min(1).optional(),
          })
          .strict()
          .optional(),
        progress: z
          .object({
            lessons: z.record(
              z
                .object({
                  completed: z.boolean(),
                  percentComplete: z.number().min(0).max(100),
                  blockCount: z.number().int().nonnegative(),
                  consumedBlockBitset: z.string().regex(/^[01]*$/),
                })
                .strict()
                .superRefine((progress, ctx) => {
                  if (progress.consumedBlockBitset.length !== progress.blockCount) {
                    ctx.addIssue({
                      code: z.ZodIssueCode.custom,
                      path: ["consumedBlockBitset"],
                      message: "consumedBlockBitset length must match blockCount.",
                    });
                  }
                }),
            ),
          })
          .strict(),
        quiz: z.record(
          z
            .object({
              attempts: z.array(
                z
                  .object({
                    attempt: z.number().int().positive(),
                    score: z
                      .object({
                        raw: z.number(),
                        min: z.number(),
                        max: z.number(),
                        scaled: z.number().min(0).max(1),
                      })
                      .strict(),
                    passed: z.boolean(),
                    answeredAt: isoDateTimeSchema,
                  })
                  .strict(),
              ),
            })
            .strict(),
        ),
        interactions: z.record(jsonValueSchema),
      })
      .strict(),
  })
  .strict();

export type StateDocumentEnvelope = z.infer<typeof stateDocumentEnvelopeSchema>;

export const defaultTheme: Theme = {
  primaryColor: "#1f6feb",
  backgroundColor: "#ffffff",
  surfaceColor: "#f6f8fa",
  textColor: "#1f2328",
  accentColor: "#dd6b20",
  headingTypeface: "Inter",
  bodyTypeface: "Inter",
  uiTypeface: "Inter",
  spacingScale: "comfortable",
};

export const defaultLabelSet: LabelSet = {
  startCourse: "Start course",
  resumeCourse: "Resume course",
  continue: "Continue",
  submit: "Submit",
  correct: "Correct",
  incorrect: "Incorrect",
  retry: "Retry",
  revealAnswer: "Reveal answer",
  nextLesson: "Next lesson",
  previousLesson: "Previous lesson",
  exitCourse: "Exit course",
  complete: "Complete",
  passed: "Passed",
  failed: "Failed",
  searchPlaceholder: "Search lessons",
};

export const defaultCourseSettings: CourseSettings = {
  navigationMode: "free",
  sidebar: {
    enabled: true,
    defaultOpen: true,
  },
  searchEnabled: true,
  showLessonCount: true,
  blockEntranceAnimation: "fade",
  videoPlaybackSpeedControl: true,
};

export function validateCourseDoc(input: unknown): CourseDoc {
  return courseDocSchema.parse(input) as CourseDoc;
}

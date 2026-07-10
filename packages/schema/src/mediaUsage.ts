import type { Block, CourseDoc, Question } from "./schemas.js";

export type MediaUseArea = "course" | "lesson" | "block" | "quiz";
export type MediaUseClassification = "decorative" | "informative" | "unknown";

export interface MediaUse {
  mediaId: string;
  area: MediaUseArea;
  path: string;
  label: string;
  classification: MediaUseClassification;
}

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const withFallback = (value: string | undefined, fallback: string): string =>
  value && value.length > 0 ? value : fallback;

const addUse = (
  uses: MediaUse[],
  mediaId: string | undefined,
  area: MediaUseArea,
  path: string,
  label: string,
  classification: MediaUseClassification,
): void => {
  if (!mediaId) {
    return;
  }
  uses.push({ mediaId, area, path, label, classification });
};

const collectBlockMediaUses = (
  uses: MediaUse[],
  block: Block,
  lessonIndex: number,
  blockIndex: number,
): void => {
  const basePath = `lessons[${lessonIndex}].blocks[${blockIndex}].payload`;

  switch (block.family) {
    case "text":
      addUse(
        uses,
        block.payload.audioMediaId,
        "block",
        `${basePath}.audioMediaId`,
        `Text audio: ${block.variant}`,
        "informative",
      );
      break;

    case "image":
      addUse(
        uses,
        block.payload.mediaId,
        "block",
        `${basePath}.mediaId`,
        `Image: ${block.variant}`,
        block.payload.alt.trim().length > 0 ? "informative" : "unknown",
      );
      break;

    case "gallery":
      block.payload.items.forEach((item, itemIndex) => {
        addUse(
          uses,
          item.mediaId,
          "block",
          `${basePath}.items[${itemIndex}].mediaId`,
          `Gallery image: ${withFallback(item.caption, item.id)}`,
          item.alt.trim().length > 0 ? "informative" : "unknown",
        );
      });
      break;

    case "multimedia":
      if (block.variant === "video") {
        addUse(
          uses,
          block.payload.mediaId,
          "block",
          `${basePath}.mediaId`,
          "Video",
          "informative",
        );
        addUse(
          uses,
          block.payload.posterMediaId,
          "block",
          `${basePath}.posterMediaId`,
          "Video poster",
          "decorative",
        );
        block.payload.captions.forEach((caption, captionIndex) => {
          addUse(
            uses,
            caption.mediaId,
            "block",
            `${basePath}.captions[${captionIndex}].mediaId`,
            `Video captions: ${caption.label}`,
            "informative",
          );
        });
      } else if (block.variant === "attachment") {
        addUse(
          uses,
          block.payload.mediaId,
          "block",
          `${basePath}.mediaId`,
          `Attachment: ${block.payload.label}`,
          "informative",
        );
      }
      break;

    case "interactive":
      block.payload.items.forEach((item, itemIndex) => {
        const itemPath = `${basePath}.items[${itemIndex}]`;
        addUse(
          uses,
          item.imageMediaId,
          "block",
          `${itemPath}.imageMediaId`,
          `Interactive item image: ${item.title}`,
          "unknown",
        );
        addUse(
          uses,
          item.audioMediaId,
          "block",
          `${itemPath}.audioMediaId`,
          `Interactive item audio: ${item.title}`,
          "informative",
        );
      });
      break;

    case "interactive-fullscreen":
      if (block.variant === "process") {
        block.payload.steps.forEach((step, stepIndex) => {
          addUse(
            uses,
            step.imageMediaId,
            "block",
            `${basePath}.steps[${stepIndex}].imageMediaId`,
            `Process step image: ${step.title}`,
            "unknown",
          );
        });
      } else if (block.variant === "labeled graphic") {
        addUse(
          uses,
          block.payload.image.mediaId,
          "block",
          `${basePath}.image.mediaId`,
          "Labeled graphic image",
          block.payload.image.alt.trim().length > 0 ? "informative" : "unknown",
        );
      } else if (block.variant === "timeline") {
        block.payload.events.forEach((event, eventIndex) => {
          addUse(
            uses,
            event.mediaId,
            "block",
            `${basePath}.events[${eventIndex}].mediaId`,
            `Timeline event media: ${event.title}`,
            "unknown",
          );
        });
      }
      break;

    case "flashcard":
      block.payload.cards.forEach((card, cardIndex) => {
        if (card.front.kind === "image") {
          addUse(
            uses,
            card.front.mediaId,
            "block",
            `${basePath}.cards[${cardIndex}].front.mediaId`,
            `Flashcard front image: ${card.id}`,
            card.front.alt.trim().length > 0 ? "informative" : "unknown",
          );
        }
        if (card.back.kind === "image") {
          addUse(
            uses,
            card.back.mediaId,
            "block",
            `${basePath}.cards[${cardIndex}].back.mediaId`,
            `Flashcard back image: ${card.id}`,
            card.back.alt.trim().length > 0 ? "informative" : "unknown",
          );
        }
      });
      break;

    case "audio":
      addUse(
        uses,
        block.payload.mediaId,
        "block",
        `${basePath}.mediaId`,
        `Audio: ${withFallback(block.payload.title, block.id)}`,
        "informative",
      );
      break;

    case "scenario":
      block.payload.scenes.forEach((scene, sceneIndex) => {
        addUse(
          uses,
          scene.mediaId,
          "block",
          `${basePath}.scenes[${sceneIndex}].mediaId`,
          `Scenario scene media: ${scene.id}`,
          "unknown",
        );
      });
      break;

    default:
      break;
  }
};

const collectQuestionMediaUses = (
  uses: MediaUse[],
  question: Question,
  lessonIndex: number,
  questionIndex: number,
): void => {
  addUse(
    uses,
    question.mediaId,
    "quiz",
    `lessons[${lessonIndex}].questions[${questionIndex}].mediaId`,
    `Quiz question media: ${withFallback(stripHtml(question.prompt), question.id)}`,
    "unknown",
  );
};

export const collectMediaUses = (course: CourseDoc): MediaUse[] => {
  const uses: MediaUse[] = [];

  addUse(
    uses,
    course.cover?.mediaId,
    "course",
    "cover.mediaId",
    "Course cover",
    "decorative",
  );
  addUse(
    uses,
    course.theme.logoMediaId,
    "course",
    "theme.logoMediaId",
    "Course logo",
    "decorative",
  );

  course.lessons.forEach((lesson, lessonIndex) => {
    if (lesson.type === "blocks") {
      addUse(
        uses,
        lesson.header?.imageMediaId,
        "lesson",
        `lessons[${lessonIndex}].header.imageMediaId`,
        `Lesson header: ${lesson.title}`,
        "decorative",
      );
      lesson.blocks.forEach((block, blockIndex) => {
        collectBlockMediaUses(uses, block, lessonIndex, blockIndex);
      });
      return;
    }

    if (lesson.type === "quiz") {
      lesson.questions.forEach((question, questionIndex) => {
        collectQuestionMediaUses(uses, question, lessonIndex, questionIndex);
      });
    }
  });

  return uses;
};

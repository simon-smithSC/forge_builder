import type { Block, CourseDoc, Lesson, PublishSettings, Question } from "@forge/schema";
import { createIriBuilders } from "./iri.js";
import { htmlToText } from "./text.js";
import { XmlWriter } from "./xml.js";

export interface TincanOptions {
  iriBase?: string;
  /** Launch document relative to the package root. Default "index.html". */
  launchHref?: string;
}

/** Activity type IRIs, exactly as in docs/reference/tincan.xml. */
export const TINCAN_ACTIVITY_TYPES = {
  course: "http://adlnet.gov/expapi/activities/course",
  module: "http://adlnet.gov/expapi/activities/module",
  interaction: "http://adlnet.gov/expapi/activities/cmi.interaction",
} as const;

type ComponentListName = "choices" | "scale" | "source" | "target" | "steps";

interface ComponentList {
  element: ComponentListName;
  components: { id: string; description: string }[];
}

interface InteractionDefinition {
  interactionId: string;
  name: string;
  interactionType: string;
  correctResponsePatterns: string[];
  componentLists: ComponentList[];
}

const CASE_PREFIX = (caseSensitive: boolean): string =>
  `{case_matters=${caseSensitive ? "true" : "false"}}`;

function choiceInteraction(
  interactionId: string,
  name: string,
  answers: { id: string; html: string; correct: boolean }[],
): InteractionDefinition {
  const correctIds = answers.filter((answer) => answer.correct).map((a) => a.id);
  return {
    interactionId,
    name,
    interactionType: "choice",
    correctResponsePatterns: correctIds.length > 0 ? [correctIds.join("[,]")] : [],
    componentLists: [
      {
        element: "choices",
        components: answers.map((answer) => ({
          id: answer.id,
          description: htmlToText(answer.html),
        })),
      },
    ],
  };
}

function fillInInteraction(
  interactionId: string,
  name: string,
  acceptedAnswers: { value: string }[],
  caseSensitive: boolean,
): InteractionDefinition {
  const values = acceptedAnswers.map((answer) => answer.value);
  return {
    interactionId,
    name,
    interactionType: "fill-in",
    correctResponsePatterns: [`${CASE_PREFIX(caseSensitive)}${values.join("[,]")}`],
    componentLists: [],
  };
}

function matchingInteraction(
  interactionId: string,
  name: string,
  pairs: { id: string; prompt: string; match: string }[],
): InteractionDefinition {
  return {
    interactionId,
    name,
    interactionType: "matching",
    correctResponsePatterns: [
      pairs.map((pair) => `source_${pair.id}[.]target_${pair.id}`).join("[,]"),
    ],
    componentLists: [
      {
        element: "source",
        components: pairs.map((pair) => ({
          id: `source_${pair.id}`,
          description: pair.prompt,
        })),
      },
      {
        element: "target",
        components: pairs.map((pair) => ({
          id: `target_${pair.id}`,
          description: pair.match,
        })),
      },
    ],
  };
}

function questionInteraction(
  interactionId: string,
  question: Question,
): InteractionDefinition {
  const name = htmlToText(question.prompt);
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "MULTIPLE_RESPONSE":
      return choiceInteraction(interactionId, name, question.answers);
    case "FILL_IN_THE_BLANK":
      return fillInInteraction(
        interactionId,
        name,
        question.acceptedAnswers,
        question.caseSensitive,
      );
    case "MATCHING":
      return matchingInteraction(interactionId, name, question.pairs);
    case "SEQUENCING": {
      const ordered = [...question.items].sort(
        (a, b) => a.correctOrder - b.correctOrder || (a.id < b.id ? -1 : 1),
      );
      return {
        interactionId,
        name,
        interactionType: "sequencing",
        correctResponsePatterns: [ordered.map((item) => item.id).join("[,]")],
        componentLists: [
          {
            element: "steps",
            components: ordered.map((item) => ({
              id: item.id,
              description: htmlToText(item.html),
            })),
          },
        ],
      };
    }
    case "NUMERIC": {
      const grading = question.grading;
      let pattern: string;
      if (grading.mode === "range") {
        pattern = `${grading.min}[:]${grading.max}`;
      } else {
        const tolerance = grading.tolerance ?? 0;
        pattern =
          tolerance > 0
            ? `${grading.value - tolerance}[:]${grading.value + tolerance}`
            : `${grading.value}`;
      }
      return {
        interactionId,
        name,
        interactionType: "numeric",
        correctResponsePatterns: [pattern],
        componentLists: [],
      };
    }
    case "LIKERT":
      // Surveys have no correct answer: the scale is declared, the
      // correctResponsePatterns element stays empty.
      return {
        interactionId,
        name,
        interactionType: "likert",
        correctResponsePatterns: [],
        componentLists: [
          {
            element: "scale",
            components: question.scale.map((step) => ({
              id: step.id,
              description: step.label,
            })),
          },
        ],
      };
  }
}

function knowledgeCheckInteraction(
  interactionId: string,
  block: Block,
): InteractionDefinition | null {
  if (block.family !== "knowledgeCheck") {
    return null;
  }
  const name = htmlToText(block.payload.prompt);
  switch (block.variant) {
    case "multiple choice":
    case "multiple response":
      return choiceInteraction(interactionId, name, block.payload.answers);
    case "fill in the blank":
      return fillInInteraction(
        interactionId,
        name,
        block.payload.acceptedAnswers,
        block.payload.caseSensitive,
      );
    case "matching":
      return matchingInteraction(interactionId, name, block.payload.pairs);
    default:
      return null;
  }
}

function interactionsForLesson(
  lesson: Lesson,
  interactionIri: (id: string) => string,
): InteractionDefinition[] {
  if (lesson.type === "quiz") {
    return lesson.questions.map((question) =>
      questionInteraction(interactionIri(question.id), question),
    );
  }
  if (lesson.type === "blocks") {
    const interactions: InteractionDefinition[] = [];
    for (const block of lesson.blocks) {
      const interaction = knowledgeCheckInteraction(interactionIri(block.id), block);
      if (interaction !== null) {
        interactions.push(interaction);
      }
    }
    return interactions;
  }
  return [];
}

function writeInteraction(
  writer: XmlWriter,
  lang: string,
  interaction: InteractionDefinition,
): void {
  writer.open("activity", {
    id: interaction.interactionId,
    type: TINCAN_ACTIVITY_TYPES.interaction,
  });
  writer.leaf("name", { lang }, interaction.name);
  writer.leaf("description", { lang }, "");
  writer.leaf("interactionType", {}, interaction.interactionType);
  writer.open("correctResponsePatterns");
  for (const pattern of interaction.correctResponsePatterns) {
    writer.leaf("correctResponsePattern", {}, pattern);
  }
  writer.close("correctResponsePatterns");
  for (const list of interaction.componentLists) {
    writer.open(list.element);
    for (const component of list.components) {
      writer.open("component");
      writer.leaf("id", {}, component.id);
      writer.leaf("description", { lang }, component.description);
      writer.close("component");
    }
    writer.close(list.element);
  }
  writer.close("activity");
}

/**
 * Generate tincan.xml per SPEC 6.6 mirroring docs/reference/tincan.xml:
 * course activity (name/description/launch), one module activity per
 * non-section lesson, one cmi.interaction activity per quiz question and
 * per knowledgeCheck block.
 */
export function buildTincanXml(
  course: CourseDoc,
  settings: PublishSettings,
  options: TincanOptions = {},
): string {
  // tincan.xml is profile-independent today; settings is part of the
  // stable signature so rise-compat variations can hook in later.
  void settings;
  const iris = createIriBuilders(options.iriBase);
  const launchHref = options.launchHref ?? "index.html";
  const lang = course.defaultLocale;

  const writer = new XmlWriter();
  writer.declaration();
  writer.open("tincan", {
    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
    xmlns: "http://projecttincan.com/tincan.xsd",
  });
  writer.open("activities");

  writer.open("activity", {
    id: iris.course(course.id),
    type: TINCAN_ACTIVITY_TYPES.course,
  });
  writer.leaf("name", { lang }, course.title);
  writer.leaf("description", { lang }, course.description);
  writer.leaf("launch", { lang }, launchHref);
  writer.close("activity");

  for (const lesson of course.lessons) {
    if (lesson.type === "section") {
      continue;
    }
    writer.open("activity", {
      id: iris.lesson(course.id, lesson.id),
      type: TINCAN_ACTIVITY_TYPES.module,
    });
    writer.leaf("name", { lang }, lesson.title);
    writer.leaf("description", { lang }, "");
    writer.close("activity");

    for (const interaction of interactionsForLesson(lesson, (id) =>
      iris.interaction(course.id, id),
    )) {
      writeInteraction(writer, lang, interaction);
    }
  }

  writer.close("activities");
  writer.close("tincan");
  return writer.toString();
}

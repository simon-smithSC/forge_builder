// Statement builder per SPEC 6.3. Every statement carries: id (uuid), actor,
// timestamp (ISO), context.registration, context.extensions with course
// version and package build id, and the correct verb IRI from the 6.3 table.
// Activity IRIs come exclusively from the @forge/schema IRI builders.
// Statement construction and interaction definitions are salvaged from the
// legacy editor publishModel.ts launcher and retyped against xAPI 1.0.3.

import {
  buildInteractionIri,
  buildLessonIri,
} from "@forge/schema";
import { generateUuid, type LaunchContext } from "./launch.js";
import type {
  AnsweredInput,
  LanguageMap,
  QuizScore,
  XapiActivity,
  XapiActivityDefinition,
  XapiContext,
  XapiInteractionComponent,
  XapiInteractionType,
  XapiResult,
  XapiScore,
  XapiStatement,
  XapiVerb,
} from "./types.js";

/** Verb IRI table per SPEC 6.3 (forge-v1 profile; rise-compat cut by ADR 0003). */
export const VERBS = {
  launched: verb("http://adlnet.gov/expapi/verbs/launched", "launched"),
  initialized: verb("http://adlnet.gov/expapi/verbs/initialized", "initialized"),
  experienced: verb("http://adlnet.gov/expapi/verbs/experienced", "experienced"),
  completed: verb("http://adlnet.gov/expapi/verbs/completed", "completed"),
  progressed: verb("http://adlnet.gov/expapi/verbs/progressed", "progressed"),
  answered: verb("http://adlnet.gov/expapi/verbs/answered", "answered"),
  passed: verb("http://adlnet.gov/expapi/verbs/passed", "passed"),
  failed: verb("http://adlnet.gov/expapi/verbs/failed", "failed"),
  terminated: verb("http://adlnet.gov/expapi/verbs/terminated", "terminated"),
  responded: verb("http://adlnet.gov/expapi/verbs/responded", "responded"),
} as const;

export const ACTIVITY_TYPES = {
  course: "http://adlnet.gov/expapi/activities/course",
  lesson: "http://adlnet.gov/expapi/activities/module",
  interaction: "http://adlnet.gov/expapi/activities/cmi.interaction",
} as const;

/** cmi5 result extension for progress percent (0-100). */
export const PROGRESS_EXTENSION =
  "https://w3id.org/xapi/cmi5/result/extensions/progress";

const DEFAULT_IRI_BASE = "https://xapi.supercell.com";

export interface StatementContextInfo {
  courseId: string;
  courseVersion: string;
  packageBuildId?: string;
  /** Namespace for Forge context/result extension IRIs. Activity IRIs always
   *  come from the @forge/schema builders and are not affected. */
  iriBase?: string;
}

function verb(id: string, display: string): XapiVerb {
  return { id, display: { "en-US": display } };
}

function languageMap(text: string): LanguageMap {
  return { "en-US": text };
}

function toXapiScore(score: QuizScore): XapiScore {
  return { scaled: score.scaled, raw: score.raw, min: score.min, max: score.max };
}

/** ISO 8601 duration from seconds, e.g. 90.5 -> "PT90.5S". */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const rounded = Math.round(safe * 100) / 100;
  return `PT${rounded}S`;
}

function components(items: Array<{ id: string; description: string }>): XapiInteractionComponent[] {
  return items.map((item) => ({ id: item.id, description: languageMap(item.description) }));
}

function numericCorrectPattern(
  correct: Extract<AnsweredInput["interaction"], { type: "numeric" }>["correct"],
): string {
  if (correct.kind === "range") {
    return `${correct.min}[:]${correct.max}`;
  }
  if (correct.tolerance !== undefined && correct.tolerance > 0) {
    return `${correct.value - correct.tolerance}[:]${correct.value + correct.tolerance}`;
  }
  return `${correct.value}`;
}

interface InteractionShape {
  interactionType: XapiInteractionType;
  response: string;
  correctResponsesPattern: string[];
  definitionComponents: Pick<
    XapiActivityDefinition,
    "choices" | "scale" | "source" | "target"
  >;
}

function shapeInteraction(interaction: AnsweredInput["interaction"]): InteractionShape {
  switch (interaction.type) {
    case "choice":
      return {
        interactionType: "choice",
        response: interaction.selectedChoiceIds.join("[,]"),
        correctResponsesPattern: [interaction.correctChoiceIds.join("[,]")],
        definitionComponents: { choices: components(interaction.choices) },
      };
    case "sequencing":
      return {
        interactionType: "sequencing",
        response: interaction.selectedOrder.join("[,]"),
        correctResponsesPattern: [interaction.correctOrder.join("[,]")],
        definitionComponents: { choices: components(interaction.choices) },
      };
    case "fill-in":
      return {
        interactionType: "fill-in",
        response: interaction.response,
        // {case_matters=...} prefix mirrors the reference tincan.xml convention.
        correctResponsesPattern: interaction.acceptedAnswers.map(
          (answer) => `{case_matters=${interaction.caseSensitive}}${answer}`,
        ),
        definitionComponents: {},
      };
    case "matching":
      return {
        interactionType: "matching",
        response: interaction.selectedPairs
          .map((pair) => `${pair.sourceId}[.]${pair.targetId}`)
          .join("[,]"),
        correctResponsesPattern: [
          interaction.correctPairs
            .map((pair) => `${pair.sourceId}[.]${pair.targetId}`)
            .join("[,]"),
        ],
        definitionComponents: {
          source: components(interaction.source),
          target: components(interaction.target),
        },
      };
    case "numeric":
      return {
        interactionType: "numeric",
        response: `${interaction.response}`,
        correctResponsesPattern: [numericCorrectPattern(interaction.correct)],
        definitionComponents: {},
      };
    case "likert":
      return {
        interactionType: "likert",
        response: interaction.selectedId,
        // Survey: no correct answer, still emits answered per SPEC 3.3.
        correctResponsesPattern: [],
        definitionComponents: { scale: components(interaction.scale) },
      };
  }
}

export class StatementBuilder {
  private readonly launch: LaunchContext;
  private readonly info: StatementContextInfo;
  private readonly extensionBase: string;
  private readonly now: () => Date;

  constructor(
    launch: LaunchContext,
    info: StatementContextInfo,
    options: { now?: () => Date } = {},
  ) {
    this.launch = launch;
    this.info = info;
    this.extensionBase = (info.iriBase ?? DEFAULT_IRI_BASE).replace(/\/+$/, "");
    this.now = options.now ?? (() => new Date());
  }

  private extensionIri(name: string): string {
    return `${this.extensionBase}/extensions/${name}`;
  }

  private courseActivity(): XapiActivity {
    return {
      objectType: "Activity",
      id: this.launch.activityId,
      definition: { type: ACTIVITY_TYPES.course },
    };
  }

  private lessonActivity(lessonId: string, title: string): XapiActivity {
    return {
      objectType: "Activity",
      id: buildLessonIri(this.info.courseId, lessonId),
      definition: { type: ACTIVITY_TYPES.lesson, name: languageMap(title) },
    };
  }

  private context(options: { parent?: XapiActivity; attempt?: number } = {}): XapiContext {
    const extensions: Record<string, unknown> = {
      [this.extensionIri("course-version")]: this.info.courseVersion,
    };
    if (this.info.packageBuildId !== undefined) {
      extensions[this.extensionIri("package-build-id")] = this.info.packageBuildId;
    }
    if (options.attempt !== undefined) {
      extensions[this.extensionIri("attempt")] = options.attempt;
    }
    const courseRef: XapiActivity = {
      objectType: "Activity",
      id: this.launch.activityId,
    };
    return {
      registration: this.launch.registration,
      contextActivities: {
        ...(options.parent ? { parent: [options.parent] } : {}),
        grouping: [courseRef],
      },
      extensions,
    };
  }

  private statement(
    verbEntry: XapiVerb,
    object: XapiActivity,
    result?: XapiResult,
    contextOptions: { parent?: XapiActivity; attempt?: number } = {},
  ): XapiStatement {
    return {
      id: generateUuid(),
      actor: this.launch.actor,
      verb: verbEntry,
      object,
      ...(result ? { result } : {}),
      context: this.context(contextOptions),
      timestamp: this.now().toISOString(),
    };
  }

  launched(): XapiStatement {
    return this.statement(VERBS.launched, this.courseActivity());
  }

  initialized(): XapiStatement {
    return this.statement(VERBS.initialized, this.courseActivity());
  }

  lessonExperienced(lessonId: string, title: string): XapiStatement {
    return this.statement(
      VERBS.experienced,
      this.lessonActivity(lessonId, title),
      undefined,
      { parent: { objectType: "Activity", id: this.launch.activityId } },
    );
  }

  lessonCompleted(
    lessonId: string,
    title: string,
    durationSeconds: number,
  ): XapiStatement {
    return this.statement(
      VERBS.completed,
      this.lessonActivity(lessonId, title),
      { completion: true, duration: formatDuration(durationSeconds) },
      { parent: { objectType: "Activity", id: this.launch.activityId } },
    );
  }

  progressed(percent: number): XapiStatement {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    return this.statement(VERBS.progressed, this.courseActivity(), {
      extensions: { [PROGRESS_EXTENSION]: clamped },
    });
  }

  answered(input: AnsweredInput): XapiStatement {
    const shape = shapeInteraction(input.interaction);
    const definition: XapiActivityDefinition = {
      type: ACTIVITY_TYPES.interaction,
      name: languageMap(input.prompt),
      description: languageMap(input.prompt),
      interactionType: shape.interactionType,
      ...(shape.correctResponsesPattern.length > 0
        ? { correctResponsesPattern: shape.correctResponsesPattern }
        : {}),
      ...shape.definitionComponents,
    };
    const object: XapiActivity = {
      objectType: "Activity",
      id: buildInteractionIri(this.info.courseId, input.questionId),
      definition,
    };
    const result: XapiResult = {
      response: shape.response,
      completion: true,
      ...(input.success !== undefined ? { success: input.success } : {}),
      ...(input.score ? { score: toXapiScore(input.score) } : {}),
    };
    return this.statement(VERBS.answered, object, result, {
      parent: { objectType: "Activity", id: this.launch.activityId },
      attempt: input.attempt,
    });
  }

  quizCompleted(lessonId: string, title: string, score: QuizScore): XapiStatement {
    return this.statement(
      VERBS.completed,
      this.lessonActivity(lessonId, title),
      { completion: true, score: toXapiScore(score) },
      { parent: { objectType: "Activity", id: this.launch.activityId } },
    );
  }

  passed(score?: QuizScore): XapiStatement {
    return this.statement(VERBS.passed, this.courseActivity(), {
      success: true,
      ...(score ? { score: toXapiScore(score) } : {}),
    });
  }

  failed(score?: QuizScore): XapiStatement {
    return this.statement(VERBS.failed, this.courseActivity(), {
      success: false,
      ...(score ? { score: toXapiScore(score) } : {}),
    });
  }

  courseCompleted(durationSeconds: number): XapiStatement {
    return this.statement(VERBS.completed, this.courseActivity(), {
      completion: true,
      duration: formatDuration(durationSeconds),
    });
  }

  terminated(durationSeconds: number): XapiStatement {
    return this.statement(VERBS.terminated, this.courseActivity(), {
      duration: formatDuration(durationSeconds),
    });
  }

  scenarioResponded(blockId: string, sceneId: string, choiceId: string): XapiStatement {
    // Scene interactions are addressed as interaction activities keyed by
    // "{blockId}.{sceneId}" so each scene has a stable IRI under the course.
    const object: XapiActivity = {
      objectType: "Activity",
      id: buildInteractionIri(this.info.courseId, `${blockId}.${sceneId}`),
      definition: {
        type: ACTIVITY_TYPES.interaction,
        interactionType: "choice",
      },
    };
    return this.statement(
      VERBS.responded,
      object,
      { response: choiceId, completion: true },
      { parent: { objectType: "Activity", id: this.launch.activityId } },
    );
  }
}

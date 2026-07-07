// xAPI 1.0.3 statement types (the subset Forge emits) plus the Forge-specific
// input shapes for answered statements. SPEC 6.3.

import type { XapiAgent } from "./launch.js";

export interface LanguageMap {
  [languageTag: string]: string;
}

export interface XapiVerb {
  id: string;
  display: LanguageMap;
}

export interface XapiInteractionComponent {
  id: string;
  description: LanguageMap;
}

export type XapiInteractionType =
  | "choice"
  | "sequencing"
  | "fill-in"
  | "long-fill-in"
  | "matching"
  | "numeric"
  | "likert"
  | "true-false"
  | "performance"
  | "other";

export interface XapiActivityDefinition {
  type?: string;
  name?: LanguageMap;
  description?: LanguageMap;
  interactionType?: XapiInteractionType;
  correctResponsesPattern?: string[];
  choices?: XapiInteractionComponent[];
  scale?: XapiInteractionComponent[];
  source?: XapiInteractionComponent[];
  target?: XapiInteractionComponent[];
  steps?: XapiInteractionComponent[];
  extensions?: Record<string, unknown>;
}

export interface XapiActivity {
  objectType: "Activity";
  id: string;
  definition?: XapiActivityDefinition;
}

export interface XapiScore {
  scaled?: number;
  raw?: number;
  min?: number;
  max?: number;
}

export interface XapiResult {
  score?: XapiScore;
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;
  extensions?: Record<string, unknown>;
}

export interface XapiContextActivities {
  parent?: XapiActivity[];
  grouping?: XapiActivity[];
  category?: XapiActivity[];
  other?: XapiActivity[];
}

export interface XapiContext {
  registration?: string;
  contextActivities?: XapiContextActivities;
  language?: string;
  extensions?: Record<string, unknown>;
}

export interface XapiStatement {
  id: string;
  actor: XapiAgent;
  verb: XapiVerb;
  object: XapiActivity;
  result?: XapiResult;
  context: XapiContext;
  timestamp: string;
}

/** Score shape used by quiz submissions and scored questions. */
export interface QuizScore {
  raw: number;
  min: number;
  max: number;
  scaled: number;
}

/** A choice/scale/source/target component as authored (plain text description). */
export interface AnsweredComponent {
  id: string;
  description: string;
}

/**
 * Interaction payloads covering knowledge checks and the 7 quiz question
 * types. MULTIPLE_CHOICE and MULTIPLE_RESPONSE both map to "choice".
 * Response string formats follow the xAPI interaction response formats and
 * the reference tincan.xml conventions:
 *   choice/sequencing: ids joined with [,]
 *   matching:          source[.]target pairs joined with [,]
 *   fill-in:           raw string; correct patterns carry {case_matters=...}
 *   numeric:           the numeric value; correct pattern min[:]max for ranges
 *   likert:            the selected scale id (survey, ungraded)
 */
export type AnsweredInteraction =
  | {
      type: "choice";
      choices: AnsweredComponent[];
      correctChoiceIds: string[];
      selectedChoiceIds: string[];
    }
  | {
      type: "sequencing";
      choices: AnsweredComponent[];
      correctOrder: string[];
      selectedOrder: string[];
    }
  | {
      type: "fill-in";
      acceptedAnswers: string[];
      caseSensitive: boolean;
      response: string;
    }
  | {
      type: "matching";
      source: AnsweredComponent[];
      target: AnsweredComponent[];
      correctPairs: Array<{ sourceId: string; targetId: string }>;
      selectedPairs: Array<{ sourceId: string; targetId: string }>;
    }
  | {
      type: "numeric";
      correct:
        | { kind: "exact"; value: number; tolerance?: number }
        | { kind: "range"; min: number; max: number };
      response: number;
    }
  | {
      type: "likert";
      scale: AnsweredComponent[];
      selectedId: string;
    };

export interface AnsweredInput {
  /** Question or knowledge check id; becomes the interaction activity IRI. */
  questionId: string;
  /** Plain text prompt; becomes object.definition.name/description. */
  prompt: string;
  interaction: AnsweredInteraction;
  /** Omit for ungraded (likert survey) answers. */
  success?: boolean;
  /** Present for scored quiz questions. */
  score?: QuizScore;
  /** 1-based attempt number; recorded in context extensions. */
  attempt: number;
}

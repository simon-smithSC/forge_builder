// Payload editor dispatcher (R2). Routes each block family to its
// purpose-built editor under ./payload/, falling back to the generic
// field-per-key form. Every proposed payload is validated with the registry's
// validatePayload; invalid proposals show the zod message inline and never
// reach the store.
import type { ComponentType, ReactElement } from "react";
import { useState } from "react";
import { getRegistryEntry } from "@forge/blocks";
import type { Block, BlockFamily } from "@forge/schema";
import { setBlockPayload } from "../state/actions.js";
import { ChartEditor, TableEditor } from "./payload/dataFamilies.js";
import { GenericPayloadEditor } from "./payload/GenericPayloadEditor.js";
import {
  InteractiveEditor,
  InteractiveFullscreenEditor,
} from "./payload/interactiveFamilies.js";
import { KnowledgeCheckEditor } from "./payload/knowledgeCheck.js";
import { AudioEditor, GalleryEditor, ImageEditor } from "./payload/mediaFamilies.js";
import { ButtonsEditor, DividerEditor, FlashcardEditor } from "./payload/miscFamilies.js";
import { MultimediaEditor } from "./payload/multimedia.js";
import { ScenarioEditor } from "./payload/scenario.js";
import {
  CalloutEditor,
  ChecklistEditor,
  ImpactEditor,
  ListEditor,
  TextEditor,
} from "./payload/textFamilies.js";
import type { FamilyEditorProps } from "./payload/types.js";
import "./payload/payload.css";

const FAMILY_EDITORS: Partial<Record<BlockFamily, ComponentType<FamilyEditorProps>>> = {
  text: TextEditor,
  impact: ImpactEditor,
  list: ListEditor,
  image: ImageEditor,
  gallery: GalleryEditor,
  divider: DividerEditor,
  multimedia: MultimediaEditor,
  interactive: InteractiveEditor,
  "interactive-fullscreen": InteractiveFullscreenEditor,
  flashcard: FlashcardEditor,
  buttons: ButtonsEditor,
  knowledgeCheck: KnowledgeCheckEditor,
  chart: ChartEditor,
  table: TableEditor,
  audio: AudioEditor,
  callout: CalloutEditor,
  scenario: ScenarioEditor,
  checklist: ChecklistEditor,
};

function zodMessage(error: unknown): string {
  const issues = (error as { issues?: { message?: string; path?: (string | number)[] }[] })
    .issues;
  const first = issues?.[0];
  if (first?.message) {
    const where =
      first.path && first.path.length > 0 ? ` (at ${first.path.join(" > ")})` : "";
    return `${first.message}${where}`;
  }
  return error instanceof Error ? error.message : "Invalid value.";
}

export function PayloadEditor({
  lessonId,
  block,
}: {
  lessonId: string;
  block: Block;
}): ReactElement {
  const entry = getRegistryEntry(block.family);
  const [error, setError] = useState<string | null>(null);
  const FamilyEditor = FAMILY_EDITORS[block.family];

  if (!FamilyEditor) {
    return <GenericPayloadEditor lessonId={lessonId} block={block} />;
  }

  const onChange = (payload: unknown): void => {
    try {
      const parsed = entry.validatePayload(payload, block.variant);
      setBlockPayload(lessonId, block.id, parsed);
      setError(null);
    } catch (validationError) {
      setError(zodMessage(validationError));
    }
  };

  return (
    <div className="fe-payload">
      {error !== null ? (
        <p className="fe-pl-error" role="alert">
          {error}
        </p>
      ) : null}
      <FamilyEditor
        block={block}
        onChange={onChange}
        {...(error !== null ? { error } : {})}
      />
    </div>
  );
}

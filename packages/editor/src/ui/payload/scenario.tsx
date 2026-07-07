// Purpose-built editor for the scenario family (branching scenes).
import type { ReactElement } from "react";
import type { Block } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { HtmlField, ItemListEditor, SelectField, StringField } from "./fields.js";
import type { SelectOption } from "./fields.js";
import { MediaPickerField } from "./mediaField.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

type ScenarioPayload = Extract<Block, { family: "scenario" }>["payload"];
type Scene = ScenarioPayload["scenes"][number];
type Choice = Scene["choices"][number];

const ENDS_VALUE = "__ends__";

function followUpValue(choice: Choice): string {
  if (choice.endsScenario) return ENDS_VALUE;
  return choice.nextSceneId ?? "";
}

function withFollowUp(choice: Choice, value: string): Choice {
  // Keep nextSceneId and endsScenario mutually exclusive, omitting the unused
  // key entirely (strict schema + exactOptionalPropertyTypes).
  if (value === ENDS_VALUE) {
    return setOptional({ ...choice, endsScenario: true }, "nextSceneId", undefined);
  }
  const cleared = setOptional(choice, "endsScenario", undefined);
  return setOptional(cleared, "nextSceneId", value === "" ? undefined : value);
}

function ChoiceFields({
  choice,
  update,
  sceneOptions,
}: {
  choice: Choice;
  update: (next: Choice) => void;
  sceneOptions: readonly SelectOption[];
}): ReactElement {
  return (
    <>
      <StringField
        label="Choice label"
        value={choice.label}
        required
        onCommit={(raw) => update({ ...choice, label: raw })}
      />
      <HtmlField
        label="Feedback (HTML)"
        value={choice.feedback ?? ""}
        placeholder="Optional feedback shown after choosing"
        onCommit={(raw) => update(setOptional(choice, "feedback", raw))}
      />
      <SelectField
        label="After this choice"
        value={followUpValue(choice)}
        options={[
          { value: "", label: "No follow-up" },
          { value: ENDS_VALUE, label: "Ends the scenario" },
          ...sceneOptions,
        ]}
        onCommit={(value) => update(withFollowUp(choice, value))}
      />
    </>
  );
}

export function ScenarioEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "scenario") return null;
  const payload = block.payload;

  const sceneOptions = payload.scenes.map((scene, index) => ({
    value: scene.id,
    label: `Scene ${index + 1}`,
  }));

  return (
    <>
      <SelectField
        label="Start scene"
        value={payload.startSceneId}
        options={sceneOptions}
        onCommit={(startSceneId) => onChange({ ...payload, startSceneId })}
      />
      <ItemListEditor
        label="Scenes"
        itemLabel="Scene"
        items={payload.scenes}
        minItems={1}
        onCommit={(scenes) => onChange({ ...payload, scenes })}
        createItem={() => ({
          id: createUlid(),
          prompt: "New scene",
          choices: [{ id: createUlid(), label: "Continue", endsScenario: true }],
        })}
        renderItem={(scene, update) => (
          <>
            <HtmlField
              label="Scene prompt (HTML)"
              value={scene.prompt}
              required
              rows={4}
              onCommit={(raw) => update({ ...scene, prompt: raw })}
            />
            <MediaPickerField
              label="Scene image"
              kind="image"
              mediaId={scene.mediaId}
              onSelect={(mediaId) => update({ ...scene, mediaId })}
              onClear={() => update(setOptional(scene, "mediaId", undefined))}
            />
            <ItemListEditor
              label="Choices"
              itemLabel="Choice"
              items={scene.choices}
              minItems={1}
              onCommit={(choices) => update({ ...scene, choices })}
              createItem={() => ({
                id: createUlid(),
                label: "New choice",
                endsScenario: true,
              })}
              renderItem={(choice, updateChoice) => (
                <ChoiceFields
                  choice={choice}
                  update={updateChoice}
                  sceneOptions={sceneOptions}
                />
              )}
            />
          </>
        )}
      />
    </>
  );
}

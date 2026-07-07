import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ScenarioBlock = BlockFor<"scenario", "branching scene">;
type Scene = ScenarioBlock["payload"]["scenes"][number];
type SceneChoice = Scene["choices"][number];

function ScenarioRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ScenarioBlock;
  const { mode, events, labels, resolveMediaUrl } = useRenderContext();
  const p = b.payload;
  const [sceneId, setSceneId] = useState<string>(p.startSceneId);
  const [pending, setPending] = useState<SceneChoice | null>(null);
  const [ended, setEnded] = useState(false);
  const [reported, setReported] = useState(false);

  const scene = p.scenes.find((s) => s.id === sceneId) ?? p.scenes[0];

  const advance = (choice: SceneChoice) => {
    setPending(null);
    if (choice.endsScenario || !choice.nextSceneId) {
      setEnded(true);
      if (mode === "player" && !reported) {
        setReported(true);
        events.onCompleted?.(b.id);
      }
      return;
    }
    setSceneId(choice.nextSceneId);
  };

  const choose = (choice: SceneChoice) => {
    if (mode === "player" && scene) {
      events.onInteracted?.(b.id, { sceneId: scene.id, choiceId: choice.id });
    }
    if (choice.feedback) {
      setPending(choice);
    } else {
      advance(choice);
    }
  };

  const startOver = () => {
    setSceneId(p.startSceneId);
    setPending(null);
    setEnded(false);
  };

  if (ended) {
    return (
      <div className="fb-scenario fb-scenario-ended">
        <p className="fb-scenario-done">✓ {labels.complete}</p>
        <button type="button" className="fb-scenario-restart" onClick={startOver}>
          Start over
        </button>
      </div>
    );
  }

  if (!scene) {
    return <div className="fb-scenario" />;
  }

  const imageUrl = scene.mediaId ? resolveMediaUrl(scene.mediaId) : undefined;

  return (
    <div className="fb-scenario">
      {scene.mediaId ? (
        imageUrl ? (
          <img src={imageUrl} alt="" className="fb-scenario-image" />
        ) : (
          <MediaPlaceholder label="Scene image" />
        )
      ) : null}
      <Html fragment={scene.prompt} className="fb-scenario-prompt" />
      {pending ? (
        <div className="fb-scenario-feedback" role="status">
          {pending.feedback ? <Html fragment={pending.feedback} /> : null}
          <button
            type="button"
            className="fb-scenario-continue"
            onClick={() => advance(pending)}
          >
            {labels.continue}
          </button>
        </div>
      ) : (
        <div className="fb-scenario-choices">
          {scene.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="fb-scenario-choice"
              onClick={() => choose(choice)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="fb-scenario-restart" onClick={startOver}>
        Start over
      </button>
    </div>
  );
}

export const scenarioEntry: BlockRegistryEntry = {
  family: "scenario",
  variants: variantsOf("scenario"),
  palette: {
    label: "Scenario",
    group: "interactive",
    description: "Branching scenes with choices and feedback.",
    icon: "git-branch",
  },
  createDefaultPayload: () => ({
    startSceneId: "scene-1",
    scenes: [
      {
        id: "scene-1",
        prompt: "<p>A learner asks a question you cannot answer. What do you do?</p>",
        choices: [
          {
            id: "choice-1",
            label: "Ask a clarifying question",
            feedback: "<p>Good instinct. Understanding the question comes first.</p>",
            nextSceneId: "scene-2",
          },
          {
            id: "choice-2",
            label: "Guess and move on",
            endsScenario: true,
          },
        ],
      },
      {
        id: "scene-2",
        prompt: "<p>The learner clarifies. You now know where to look.</p>",
        choices: [
          {
            id: "choice-3",
            label: "Wrap up",
            endsScenario: true,
          },
        ],
      },
    ],
  }),
  validatePayload: (payload, variant) =>
    validateWithSchema("scenario", variant, payload),
  Renderer: ScenarioRendererImpl,
};

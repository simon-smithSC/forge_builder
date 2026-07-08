// Purpose-built editors for the knowledgeCheck family: multiple choice,
// multiple response, fill in the blank, and matching.
import type { ReactElement } from "react";
import { useId } from "react";
import { Radio } from "@forge/ui";
import type { Block } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { HtmlField, ItemListEditor, StringField, ToggleField } from "./fields.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

type ChoicePayload = Extract<
  Block,
  { family: "knowledgeCheck"; variant: "multiple choice" }
>["payload"];
type FillBlankPayload = Extract<
  Block,
  { family: "knowledgeCheck"; variant: "fill in the blank" }
>["payload"];
type MatchingPayload = Extract<
  Block,
  { family: "knowledgeCheck"; variant: "matching" }
>["payload"];

type Commit = (payload: unknown) => void;

interface FeedbackShape {
  correctFeedback: string;
  incorrectFeedback: string;
  rationale?: string | undefined;
}

function FeedbackFields<T extends FeedbackShape>({
  payload,
  onChange,
}: {
  payload: T;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <HtmlField
        label="Correct answer feedback (HTML)"
        value={payload.correctFeedback}
        required
        onCommit={(raw) => onChange({ ...payload, correctFeedback: raw })}
      />
      <HtmlField
        label="Incorrect answer feedback (HTML)"
        value={payload.incorrectFeedback}
        required
        onCommit={(raw) => onChange({ ...payload, incorrectFeedback: raw })}
      />
      <HtmlField
        label="Rationale (HTML)"
        value={payload.rationale ?? ""}
        onCommit={(raw) => onChange(setOptional(payload, "rationale", raw))}
      />
    </>
  );
}

function ChoiceEditor({
  payload,
  single,
  onChange,
}: {
  payload: ChoicePayload;
  single: boolean;
  onChange: Commit;
}): ReactElement {
  const group = useId();

  return (
    <>
      <HtmlField
        label="Question prompt (HTML)"
        value={payload.prompt}
        required
        rows={4}
        onCommit={(raw) => onChange({ ...payload, prompt: raw })}
      />
      <ItemListEditor
        label="Answers"
        itemLabel="Answer"
        items={payload.answers}
        minItems={2}
        onCommit={(answers) => onChange({ ...payload, answers })}
        addLabel="Add answer"
        createItem={() => ({ id: createUlid(), html: "New answer", correct: false })}
        renderItem={(answer, update, index) => (
          <>
            <HtmlField
              label="Answer text (HTML)"
              value={answer.html}
              required
              onCommit={(raw) => update({ ...answer, html: raw })}
            />
            {single ? (
              // Radio semantics: marking one answer correct clears the others.
              <Radio
                className="fe-field fe-field-checkbox"
                label="Correct answer"
                name={group}
                checked={answer.correct}
                onChange={() =>
                  onChange({
                    ...payload,
                    answers: payload.answers.map((existing, i) => ({
                      ...existing,
                      correct: i === index,
                    })),
                  })
                }
              />
            ) : (
              <ToggleField
                label="Correct answer"
                checked={answer.correct}
                onCommit={(correct) => update({ ...answer, correct })}
              />
            )}
            <HtmlField
              label="Answer feedback (HTML)"
              value={answer.feedback ?? ""}
              placeholder="Optional per-answer feedback"
              onCommit={(raw) => update(setOptional(answer, "feedback", raw))}
            />
          </>
        )}
      />
      <FeedbackFields payload={payload} onChange={onChange} />
    </>
  );
}

function FillBlankEditor({
  payload,
  onChange,
}: {
  payload: FillBlankPayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <HtmlField
        label="Question prompt (HTML)"
        value={payload.prompt}
        required
        rows={4}
        onCommit={(raw) => onChange({ ...payload, prompt: raw })}
      />
      <ItemListEditor
        label="Accepted answers"
        itemLabel="Accepted answer"
        items={payload.acceptedAnswers}
        minItems={1}
        onCommit={(acceptedAnswers) => onChange({ ...payload, acceptedAnswers })}
        createItem={() => ({ id: createUlid(), value: "Answer" })}
        renderItem={(answer, update) => (
          <StringField
            label="Answer text"
            value={answer.value}
            required
            onCommit={(raw) => update({ ...answer, value: raw })}
          />
        )}
      />
      <ToggleField
        label="Case sensitive"
        checked={payload.caseSensitive}
        onCommit={(caseSensitive) => onChange({ ...payload, caseSensitive })}
      />
      <FeedbackFields payload={payload} onChange={onChange} />
    </>
  );
}

function MatchingEditor({
  payload,
  onChange,
}: {
  payload: MatchingPayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <HtmlField
        label="Question prompt (HTML)"
        value={payload.prompt}
        required
        rows={4}
        onCommit={(raw) => onChange({ ...payload, prompt: raw })}
      />
      <ItemListEditor
        label="Matching pairs"
        itemLabel="Pair"
        items={payload.pairs}
        minItems={1}
        onCommit={(pairs) => onChange({ ...payload, pairs })}
        createItem={() => ({ id: createUlid(), prompt: "Prompt", match: "Match" })}
        renderItem={(pair, update) => (
          <>
            <StringField
              label="Prompt"
              value={pair.prompt}
              required
              onCommit={(raw) => update({ ...pair, prompt: raw })}
            />
            <StringField
              label="Match"
              value={pair.match}
              required
              onCommit={(raw) => update({ ...pair, match: raw })}
            />
          </>
        )}
      />
      <FeedbackFields payload={payload} onChange={onChange} />
    </>
  );
}

export function KnowledgeCheckEditor({
  block,
  onChange,
}: FamilyEditorProps): ReactElement | null {
  if (block.family !== "knowledgeCheck") return null;
  switch (block.variant) {
    case "multiple choice":
      return <ChoiceEditor payload={block.payload} single onChange={onChange} />;
    case "multiple response":
      return <ChoiceEditor payload={block.payload} single={false} onChange={onChange} />;
    case "fill in the blank":
      return <FillBlankEditor payload={block.payload} onChange={onChange} />;
    case "matching":
      return <MatchingEditor payload={block.payload} onChange={onChange} />;
    default:
      return null;
  }
}

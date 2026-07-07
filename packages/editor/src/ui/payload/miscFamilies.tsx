// Purpose-built editors for flashcard, buttons, and divider families.
import type { ReactElement } from "react";
import { useId, useState } from "react";
import type { Block, Lesson } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { useStore } from "../../state/store.js";
import { HtmlField, ItemListEditor, NumberField, SelectField, StringField } from "./fields.js";
import { MediaPicker, MediaPickerField } from "./mediaField.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

type FlashcardPayload = Extract<Block, { family: "flashcard" }>["payload"];
type CardSide = FlashcardPayload["cards"][number]["front"];

function CardSideEditor({
  label,
  side,
  onCommit,
}: {
  label: string;
  side: CardSide;
  onCommit: (side: CardSide) => void;
}): ReactElement {
  const group = useId();
  // Switching to an image side opens the picker first so we never propose a
  // payload with an empty mediaId (which validation would reject).
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <fieldset className="fe-object">
      <legend>{label}</legend>
      <div className="fe-field-row fe-pl-kind-row">
        <label className="fe-radio">
          <input
            type="radio"
            name={group}
            checked={side.kind === "text"}
            onChange={() => {
              if (side.kind !== "text") onCommit({ kind: "text", html: "Text" });
            }}
          />
          Text
        </label>
        <label className="fe-radio">
          <input
            type="radio"
            name={group}
            checked={side.kind === "image"}
            onChange={() => {
              if (side.kind !== "image") setPickerOpen(true);
            }}
          />
          Image
        </label>
      </div>
      {side.kind === "text" ? (
        <HtmlField
          label="Side text (HTML)"
          value={side.html}
          required
          onCommit={(raw) => onCommit({ kind: "text", html: raw })}
        />
      ) : (
        <>
          <MediaPickerField
            label="Image"
            kind="image"
            mediaId={side.mediaId}
            required
            onSelect={(mediaId) => onCommit({ ...side, mediaId })}
          />
          <StringField
            label="Alt text"
            value={side.alt}
            required
            onCommit={(raw) => onCommit({ ...side, alt: raw })}
          />
        </>
      )}
      <MediaPicker
        open={pickerOpen}
        kind="image"
        onClose={() => setPickerOpen(false)}
        onSelect={(mediaId: string) => {
          setPickerOpen(false);
          onCommit({ kind: "image", mediaId, alt: "Image" });
        }}
      />
    </fieldset>
  );
}

export function FlashcardEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "flashcard") return null;
  const payload = block.payload;

  return (
    <ItemListEditor
      label="Cards"
      itemLabel="Card"
      items={payload.cards}
      minItems={1}
      onCommit={(cards) => onChange({ cards })}
      createItem={() => ({
        id: createUlid(),
        front: { kind: "text" as const, html: "Front" },
        back: { kind: "text" as const, html: "Back" },
      })}
      renderItem={(card, update) => (
        <>
          <CardSideEditor
            label="Front side"
            side={card.front}
            onCommit={(front) => update({ ...card, front })}
          />
          <CardSideEditor
            label="Back side"
            side={card.back}
            onCommit={(back) => update({ ...card, back })}
          />
        </>
      )}
    />
  );
}

const EMPTY_LESSONS: Lesson[] = [];

export function ButtonsEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  const lessons = useStore((state) => state.course?.lessons ?? EMPTY_LESSONS);
  const selectedLessonId = useStore((state) => state.selectedLessonId);
  if (block.family !== "buttons") return null;
  const payload = block.payload;

  const lessonOptions = lessons
    .filter((lesson) => lesson.type !== "section")
    .map((lesson) => ({ value: lesson.id, label: lesson.title }));
  const fallbackLessonId = lessonOptions[0]?.value ?? selectedLessonId ?? "";

  return (
    <ItemListEditor
      label="Buttons"
      itemLabel="Button"
      items={payload.buttons}
      minItems={1}
      onCommit={(buttons) => onChange({ buttons })}
      createItem={() => ({
        id: createUlid(),
        label: "New button",
        destination: { type: "url" as const, url: "https://example.com" },
      })}
      renderItem={(button, update) => {
        const destination = button.destination;
        return (
          <>
            <StringField
              label="Button label"
              value={button.label}
              required
              onCommit={(raw) => update({ ...button, label: raw })}
            />
            <SelectField
              label="Destination type"
              value={destination.type}
              options={[
                { value: "url", label: "Web link" },
                { value: "lesson", label: "Lesson" },
                { value: "mailto", label: "Email" },
              ]}
              onCommit={(type) => {
                if (type === destination.type) return;
                if (type === "url") {
                  update({ ...button, destination: { type: "url", url: "https://example.com" } });
                } else if (type === "lesson") {
                  update({ ...button, destination: { type: "lesson", lessonId: fallbackLessonId } });
                } else {
                  update({ ...button, destination: { type: "mailto", email: "name@example.com" } });
                }
              }}
            />
            {destination.type === "url" ? (
              <StringField
                label="URL"
                value={destination.url}
                required
                hint="Full URL, e.g. https://example.com"
                onCommit={(url) => update({ ...button, destination: { type: "url", url } })}
              />
            ) : null}
            {destination.type === "lesson" ? (
              lessonOptions.length > 0 ? (
                <SelectField
                  label="Lesson"
                  value={destination.lessonId}
                  options={lessonOptions}
                  onCommit={(lessonId) =>
                    update({ ...button, destination: { type: "lesson", lessonId } })
                  }
                />
              ) : (
                <StringField
                  label="Lesson id"
                  value={destination.lessonId}
                  required
                  onCommit={(lessonId) =>
                    update({ ...button, destination: { type: "lesson", lessonId } })
                  }
                />
              )
            ) : null}
            {destination.type === "mailto" ? (
              <>
                <StringField
                  label="Email address"
                  value={destination.email}
                  required
                  onCommit={(email) =>
                    update({ ...button, destination: { ...destination, email } })
                  }
                />
                <StringField
                  label="Subject"
                  value={destination.subject ?? ""}
                  placeholder="Optional subject line"
                  onCommit={(raw) =>
                    update({ ...button, destination: setOptional(destination, "subject", raw) })
                  }
                />
              </>
            ) : null}
          </>
        );
      }}
    />
  );
}

export function DividerEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "divider") return null;

  switch (block.variant) {
    case "line":
      return (
        <SelectField
          label="Line style"
          value={block.payload.style}
          options={[
            { value: "solid", label: "Solid" },
            { value: "dashed", label: "Dashed" },
            { value: "dotted", label: "Dotted" },
          ]}
          onCommit={(style) => onChange({ style })}
        />
      );
    case "numbered": {
      const payload = block.payload;
      return (
        <>
          <NumberField
            label="Number"
            value={payload.number}
            min={1}
            step={1}
            onCommit={(number) => onChange({ ...payload, number })}
          />
          <StringField
            label="Label"
            value={payload.label ?? ""}
            placeholder="Optional label"
            onCommit={(raw) => onChange(setOptional(payload, "label", raw))}
          />
        </>
      );
    }
    case "spacer":
      return (
        <SelectField
          label="Spacer size"
          value={block.payload.size}
          options={[
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
          ]}
          onCommit={(size) => onChange({ size })}
        />
      );
    case "continue button":
      return (
        <StringField
          label="Button label"
          value={block.payload.label}
          required
          onCommit={(label) => onChange({ label })}
        />
      );
    default:
      return null;
  }
}

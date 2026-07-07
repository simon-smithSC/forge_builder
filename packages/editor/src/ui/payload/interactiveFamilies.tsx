// Purpose-built editors for interactive (accordion/tabs) and the fullscreen
// interactions (process, labeled graphic, timeline, sorting).
import type { ReactElement } from "react";
import type { Block } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { HtmlField, ItemListEditor, NumberField, SelectField, StringField } from "./fields.js";
import { MediaPickerField } from "./mediaField.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

type ProcessPayload = Extract<
  Block,
  { family: "interactive-fullscreen"; variant: "process" }
>["payload"];
type LabeledGraphicPayload = Extract<
  Block,
  { family: "interactive-fullscreen"; variant: "labeled graphic" }
>["payload"];
type TimelinePayload = Extract<
  Block,
  { family: "interactive-fullscreen"; variant: "timeline" }
>["payload"];
type SortingPayload = Extract<
  Block,
  { family: "interactive-fullscreen"; variant: "sorting" }
>["payload"];

type Commit = (payload: unknown) => void;

export function InteractiveEditor({
  block,
  onChange,
}: FamilyEditorProps): ReactElement | null {
  if (block.family !== "interactive") return null;
  const payload = block.payload;
  const tabs = block.variant === "tabs";

  // P1/P3: panel body html is edited in place on the canvas (open the
  // accordion item / activate the tab, then click the text); the drawer
  // keeps titles, item structure, and media.
  return (
    <ItemListEditor
      label={tabs ? "Tabs" : "Accordion items"}
      itemLabel={tabs ? "Tab" : "Item"}
      items={payload.items}
      minItems={1}
      onCommit={(items) => onChange({ items })}
      createItem={() => ({ id: createUlid(), title: "New item", html: "Content" })}
      renderItem={(item, update) => (
        <>
          <StringField
            label="Title"
            value={item.title}
            required
            onCommit={(raw) => update({ ...item, title: raw })}
          />
          <MediaPickerField
            label="Image"
            kind="image"
            mediaId={item.imageMediaId}
            onSelect={(imageMediaId) => update({ ...item, imageMediaId })}
            onClear={() => update(setOptional(item, "imageMediaId", undefined))}
          />
          <MediaPickerField
            label="Audio"
            kind="audio"
            mediaId={item.audioMediaId}
            onSelect={(audioMediaId) => update({ ...item, audioMediaId })}
            onClear={() => update(setOptional(item, "audioMediaId", undefined))}
          />
        </>
      )}
    />
  );
}

function ProcessEditor({
  payload,
  onChange,
}: {
  payload: ProcessPayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <HtmlField
        label="Introduction (HTML)"
        value={payload.intro}
        required
        rows={4}
        onCommit={(raw) => onChange({ ...payload, intro: raw })}
      />
      <ItemListEditor
        label="Steps"
        itemLabel="Step"
        items={payload.steps}
        minItems={1}
        onCommit={(steps) => onChange({ ...payload, steps })}
        createItem={() => ({ id: createUlid(), title: "New step", html: "Step details" })}
        renderItem={(step, update) => (
          <>
            <StringField
              label="Step title"
              value={step.title}
              required
              onCommit={(raw) => update({ ...step, title: raw })}
            />
            <HtmlField
              label="Step text (HTML)"
              value={step.html}
              required
              onCommit={(raw) => update({ ...step, html: raw })}
            />
            <MediaPickerField
              label="Image"
              kind="image"
              mediaId={step.imageMediaId}
              onSelect={(imageMediaId) => update({ ...step, imageMediaId })}
              onClear={() => update(setOptional(step, "imageMediaId", undefined))}
            />
          </>
        )}
      />
      <HtmlField
        label="Summary (HTML)"
        value={payload.summary ?? ""}
        rows={4}
        onCommit={(raw) => onChange(setOptional(payload, "summary", raw))}
      />
    </>
  );
}

function LabeledGraphicEditor({
  payload,
  onChange,
}: {
  payload: LabeledGraphicPayload;
  onChange: Commit;
}): ReactElement {
  return (
    <>
      <MediaPickerField
        label="Base image"
        kind="image"
        mediaId={payload.image.mediaId}
        required
        onSelect={(mediaId) =>
          onChange({ ...payload, image: { ...payload.image, mediaId } })
        }
      />
      <StringField
        label="Image alt text"
        value={payload.image.alt}
        required
        onCommit={(raw) => onChange({ ...payload, image: { ...payload.image, alt: raw } })}
      />
      <ItemListEditor
        label="Markers"
        itemLabel="Marker"
        items={payload.markers}
        minItems={1}
        onCommit={(markers) => onChange({ ...payload, markers })}
        createItem={() => ({
          id: createUlid(),
          x: 50,
          y: 50,
          title: "New marker",
          html: "Details",
        })}
        renderItem={(marker, update) => (
          <>
            <NumberField
              label="X position (0-100)"
              value={marker.x}
              min={0}
              max={100}
              onCommit={(x) => update({ ...marker, x })}
            />
            <NumberField
              label="Y position (0-100)"
              value={marker.y}
              min={0}
              max={100}
              onCommit={(y) => update({ ...marker, y })}
            />
            <StringField
              label="Marker title"
              value={marker.title}
              required
              onCommit={(raw) => update({ ...marker, title: raw })}
            />
            <HtmlField
              label="Marker text (HTML)"
              value={marker.html}
              required
              onCommit={(raw) => update({ ...marker, html: raw })}
            />
          </>
        )}
      />
    </>
  );
}

function TimelineEditor({
  payload,
  onChange,
}: {
  payload: TimelinePayload;
  onChange: Commit;
}): ReactElement {
  return (
    <ItemListEditor
      label="Timeline events"
      itemLabel="Event"
      items={payload.events}
      minItems={1}
      onCommit={(events) => onChange({ events })}
      createItem={() => ({
        id: createUlid(),
        date: "2026",
        title: "New event",
        html: "Details",
      })}
      renderItem={(event, update) => (
        <>
          <StringField
            label="Date"
            value={event.date}
            required
            hint="Free text, e.g. 1969 or July 2026."
            onCommit={(raw) => update({ ...event, date: raw })}
          />
          <StringField
            label="Event title"
            value={event.title}
            required
            onCommit={(raw) => update({ ...event, title: raw })}
          />
          <HtmlField
            label="Event text (HTML)"
            value={event.html}
            required
            onCommit={(raw) => update({ ...event, html: raw })}
          />
          <MediaPickerField
            label="Image"
            kind="image"
            mediaId={event.mediaId}
            onSelect={(mediaId) => update({ ...event, mediaId })}
            onClear={() => update(setOptional(event, "mediaId", undefined))}
          />
        </>
      )}
    />
  );
}

function SortingEditor({
  payload,
  onChange,
}: {
  payload: SortingPayload;
  onChange: Commit;
}): ReactElement {
  const pileOptions = payload.piles.map((pile) => ({ value: pile.id, label: pile.label }));

  return (
    <>
      <ItemListEditor
        label="Piles"
        itemLabel="Pile"
        items={payload.piles}
        minItems={2}
        onCommit={(piles) => onChange({ ...payload, piles })}
        createItem={() => ({ id: createUlid(), label: "New pile" })}
        renderItem={(pile, update) => (
          <StringField
            label="Pile label"
            value={pile.label}
            required
            onCommit={(raw) => update({ ...pile, label: raw })}
          />
        )}
      />
      <ItemListEditor
        label="Sortable items"
        itemLabel="Item"
        items={payload.items}
        minItems={1}
        onCommit={(items) => onChange({ ...payload, items })}
        createItem={() => ({
          id: createUlid(),
          label: "New item",
          correctPileId: payload.piles[0]?.id ?? "",
        })}
        renderItem={(item, update) => (
          <>
            <StringField
              label="Item label"
              value={item.label}
              required
              onCommit={(raw) => update({ ...item, label: raw })}
            />
            <SelectField
              label="Correct pile"
              value={item.correctPileId}
              options={pileOptions}
              onCommit={(correctPileId) => update({ ...item, correctPileId })}
            />
            <StringField
              label="Feedback"
              value={item.feedback ?? ""}
              placeholder="Optional feedback"
              onCommit={(raw) => update(setOptional(item, "feedback", raw))}
            />
          </>
        )}
      />
    </>
  );
}

export function InteractiveFullscreenEditor({
  block,
  onChange,
}: FamilyEditorProps): ReactElement | null {
  if (block.family !== "interactive-fullscreen") return null;
  switch (block.variant) {
    case "process":
      return <ProcessEditor payload={block.payload} onChange={onChange} />;
    case "labeled graphic":
      return <LabeledGraphicEditor payload={block.payload} onChange={onChange} />;
    case "timeline":
      return <TimelineEditor payload={block.payload} onChange={onChange} />;
    case "sorting":
      return <SortingEditor payload={block.payload} onChange={onChange} />;
    default:
      return null;
  }
}

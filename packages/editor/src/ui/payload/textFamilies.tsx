// Purpose-built editors for the text-centric families: text, list, checklist,
// callout, and impact. P1/P3: their html fragments are edited IN PLACE on the
// canvas (EditableHtml + InlineHtmlEditor), so the drawer keeps only
// structure: add/remove/reorder items, toggles, attribution, media. Item rows
// show a read-only snippet so authors can tell items apart while reordering.
import type { ReactElement } from "react";
import { createUlid } from "@forge/schema";
import { ItemListEditor, StringField, ToggleField } from "./fields.js";
import { MediaPickerField } from "./mediaField.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

/** Plain-text preview of an html fragment for identifying list items. */
export function htmlSnippet(html: string, max = 60): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length === 0) return "(empty)";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function ItemSnippet({ html }: { html: string }): ReactElement {
  return <p className="fe-pl-snippet">{htmlSnippet(html)}</p>;
}

function CanvasEditHint(): ReactElement {
  return <p className="fe-pl-hint">Text is edited directly on the block.</p>;
}

export function TextEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "text") return null;

  if (block.variant === "two column") {
    return <CanvasEditHint />;
  }

  const payload = block.payload as Record<string, unknown> & {
    audioMediaId?: string;
  };

  return (
    <>
      <CanvasEditHint />
      <MediaPickerField
        label="Audio"
        kind="audio"
        mediaId={payload.audioMediaId}
        onSelect={(audioMediaId) => onChange({ ...payload, audioMediaId })}
        onClear={() => onChange(setOptional(payload, "audioMediaId", undefined))}
      />
    </>
  );
}

export function ListEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "list") return null;
  const payload = block.payload;
  const showChecked = block.variant === "checkboxes";

  return (
    <>
      <CanvasEditHint />
      <ItemListEditor
        label="List items"
        itemLabel="Item"
        items={payload.items}
        minItems={1}
        onCommit={(items) => onChange({ items })}
        createItem={() => ({ id: createUlid(), html: "New item" })}
        renderItem={(item, update) => (
          <>
            <ItemSnippet html={item.html} />
            {showChecked ? (
              <ToggleField
                label="Checked"
                checked={item.checked ?? false}
                onCommit={(checked) => update({ ...item, checked })}
              />
            ) : null}
          </>
        )}
      />
    </>
  );
}

export function ChecklistEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "checklist") return null;
  const payload = block.payload;

  return (
    <>
      <CanvasEditHint />
      <ToggleField
        label="Required for lesson completion"
        checked={payload.requiredForCompletion}
        onCommit={(requiredForCompletion) => onChange({ ...payload, requiredForCompletion })}
      />
      <ItemListEditor
        label="Checklist items"
        itemLabel="Task"
        items={payload.items}
        minItems={1}
        onCommit={(items) => onChange({ ...payload, items })}
        createItem={() => ({ id: createUlid(), html: "New task" })}
        renderItem={(item, update) => (
          <>
            <ItemSnippet html={item.html} />
            <ToggleField
              label="Initially checked"
              checked={item.initiallyChecked ?? false}
              onCommit={(initiallyChecked) => update({ ...item, initiallyChecked })}
            />
          </>
        )}
      />
    </>
  );
}

export function CalloutEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "callout") return null;
  const payload = block.payload;

  return (
    <>
      <CanvasEditHint />
      <StringField
        label="Title"
        value={payload.title ?? ""}
        placeholder="Optional title"
        onCommit={(raw) => onChange(setOptional(payload, "title", raw))}
      />
      <StringField
        label="Icon"
        value={payload.icon ?? ""}
        placeholder="Optional icon name"
        onCommit={(raw) => onChange(setOptional(payload, "icon", raw))}
      />
    </>
  );
}

export function ImpactEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "impact") return null;
  const payload = block.payload;

  return (
    <>
      <CanvasEditHint />
      <StringField
        label="Attribution"
        value={payload.attribution ?? ""}
        placeholder="Optional attribution"
        onCommit={(raw) => onChange(setOptional(payload, "attribution", raw))}
      />
    </>
  );
}

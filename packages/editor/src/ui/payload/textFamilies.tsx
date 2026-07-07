// Purpose-built editors for the text-centric families: text, list, checklist,
// callout, and impact.
import type { ReactElement } from "react";
import { createUlid } from "@forge/schema";
import { HtmlField, ItemListEditor, StringField, ToggleField } from "./fields.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

export function TextEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "text") return null;

  if (block.variant === "two column") {
    const payload = block.payload;
    return (
      <>
        {payload.columns.map((column, index) => (
          <HtmlField
            key={column.id}
            label={`Column ${index + 1} text (HTML)`}
            value={column.html}
            required
            onCommit={(raw) =>
              onChange({
                columns: payload.columns.map((existing, i) =>
                  i === index ? { ...existing, html: raw } : existing,
                ),
              })
            }
          />
        ))}
      </>
    );
  }

  const payload = block.payload as Record<string, unknown>;
  const commit = (key: string, raw: string): void => onChange({ ...payload, [key]: raw });

  return (
    <>
      {typeof payload.heading === "string" ? (
        <HtmlField
          label="Heading (HTML)"
          value={payload.heading}
          required
          onCommit={(raw) => commit("heading", raw)}
        />
      ) : null}
      {typeof payload.subheading === "string" ? (
        <HtmlField
          label="Subheading (HTML)"
          value={payload.subheading}
          required
          onCommit={(raw) => commit("subheading", raw)}
        />
      ) : null}
      {typeof payload.html === "string" ? (
        <HtmlField
          label="Text (HTML)"
          value={payload.html}
          required
          rows={5}
          onCommit={(raw) => commit("html", raw)}
        />
      ) : null}
    </>
  );
}

export function ListEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "list") return null;
  const payload = block.payload;
  const showChecked = block.variant === "checkboxes";

  return (
    <ItemListEditor
      label="List items"
      itemLabel="Item"
      items={payload.items}
      minItems={1}
      onCommit={(items) => onChange({ items })}
      createItem={() => ({ id: createUlid(), html: "New item" })}
      renderItem={(item, update) => (
        <>
          <HtmlField
            label="Item text (HTML)"
            value={item.html}
            required
            onCommit={(raw) => update({ ...item, html: raw })}
          />
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
  );
}

export function ChecklistEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "checklist") return null;
  const payload = block.payload;

  return (
    <>
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
            <HtmlField
              label="Task text (HTML)"
              value={item.html}
              required
              onCommit={(raw) => update({ ...item, html: raw })}
            />
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
      <StringField
        label="Title"
        value={payload.title ?? ""}
        placeholder="Optional title"
        onCommit={(raw) => onChange(setOptional(payload, "title", raw))}
      />
      <HtmlField
        label="Text (HTML)"
        value={payload.html}
        required
        rows={4}
        onCommit={(raw) => onChange({ ...payload, html: raw })}
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
      <HtmlField
        label="Text (HTML)"
        value={payload.html}
        required
        rows={4}
        onCommit={(raw) => onChange({ ...payload, html: raw })}
      />
      <StringField
        label="Attribution"
        value={payload.attribution ?? ""}
        placeholder="Optional attribution"
        onCommit={(raw) => onChange(setOptional(payload, "attribution", raw))}
      />
    </>
  );
}

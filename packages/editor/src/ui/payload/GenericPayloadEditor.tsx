// Generic field-per-key payload editor (the R1 fallback). Used for any family
// without a purpose-built editor. Every edit is validated with the registry's
// validatePayload; invalid edits show the zod message inline and never mutate
// the store.
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { getRegistryEntry } from "@forge/blocks";
import type { Block } from "@forge/schema";
import { createUlid } from "@forge/schema";
import { importMediaFile, setBlockPayload } from "../../state/actions.js";
import { useStore } from "../../state/store.js";

type Path = (string | number)[];

interface EditCtx {
  commit: (path: Path, value: unknown) => boolean;
  errorFor: (path: Path) => string | null;
}

const HTML_KEYS = new Set([
  "html",
  "heading",
  "subheading",
  "prompt",
  "transcript",
  "intro",
  "summary",
  "correctFeedback",
  "incorrectFeedback",
  "rationale",
  "feedback",
]);

function pathKey(path: Path): string {
  return path.join(".");
}

function isMediaKey(key: string): boolean {
  return key === "mediaId" || key.endsWith("MediaId");
}

function labelFor(key: string, htmlish: boolean): string {
  if (htmlish) return "Text (HTML)";
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function setAtPath(root: unknown, path: Path, value: unknown): unknown {
  const head = path[0];
  if (head === undefined) return value;
  const rest = path.slice(1);
  if (typeof head === "number") {
    const list = Array.isArray(root) ? [...root] : [];
    list[head] = setAtPath(list[head], rest, value);
    return list;
  }
  const record = { ...((root ?? {}) as Record<string, unknown>) };
  record[head] = setAtPath(record[head], rest, value);
  return record;
}

function zodMessage(error: unknown): string {
  const issues = (error as { issues?: { message?: string }[] }).issues;
  const first = issues?.[0];
  if (first?.message) return first.message;
  return error instanceof Error ? error.message : "Invalid value.";
}

/** Deep clone an item, regenerating every property literally named "id". */
function cloneItemWithFreshIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneItemWithFreshIds);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = key === "id" && typeof item === "string" ? createUlid() : cloneItemWithFreshIds(item);
    }
    return out;
  }
  return value;
}

function FieldError({ message }: { message: string | null }): ReactElement | null {
  if (!message) return null;
  return <span className="fe-field-error">{message}</span>;
}

function StringField({
  ctx,
  path,
  value,
  fieldKey,
}: {
  ctx: EditCtx;
  path: Path;
  value: string;
  fieldKey: string;
}): ReactElement {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const htmlish = HTML_KEYS.has(fieldKey) || (value.includes("<") && value.includes(">"));

  const onChange = (raw: string): void => {
    setDraft(raw);
    if (ctx.commit(path, raw)) return;
    // Optional fields accept removal when emptied.
    if (raw === "") ctx.commit(path, undefined);
  };

  return (
    <label className="fe-field">
      <span className="fe-field-label">{labelFor(fieldKey, htmlish)}</span>
      {htmlish ? (
        <textarea
          value={draft}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input value={draft} onChange={(event) => onChange(event.target.value)} />
      )}
      <FieldError message={ctx.errorFor(path)} />
    </label>
  );
}

function NumberField({
  ctx,
  path,
  value,
  fieldKey,
}: {
  ctx: EditCtx;
  path: Path;
  value: number;
  fieldKey: string;
}): ReactElement {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <label className="fe-field">
      <span className="fe-field-label">{labelFor(fieldKey, false)}</span>
      <input
        type="number"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = Number(event.target.value);
          if (!Number.isNaN(parsed)) ctx.commit(path, parsed);
        }}
      />
      <FieldError message={ctx.errorFor(path)} />
    </label>
  );
}

function MediaField({
  ctx,
  path,
  value,
  fieldKey,
}: {
  ctx: EditCtx;
  path: Path;
  value: string;
  fieldKey: string;
}): ReactElement {
  const media = useStore((state) => state.course?.media ?? {});
  const current = media[value];

  return (
    <div className="fe-field">
      <span className="fe-field-label">{labelFor(fieldKey, false)}</span>
      <span className="fe-media-current">
        {current ? current.filename : value ? `Unresolved (${value})` : "None"}
      </span>
      <input
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const mediaId = importMediaFile(file);
          ctx.commit(path, mediaId);
        }}
      />
      <FieldError message={ctx.errorFor(path)} />
    </div>
  );
}

function ArrayField({
  ctx,
  path,
  value,
  fieldKey,
}: {
  ctx: EditCtx;
  path: Path;
  value: unknown[];
  fieldKey: string;
}): ReactElement {
  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const a = next[index];
    next[index] = next[target];
    next[target] = a;
    ctx.commit(path, next);
  };

  const remove = (index: number): void => {
    ctx.commit(path, value.filter((_, i) => i !== index));
  };

  const add = (): void => {
    const template = value[value.length - 1];
    if (template === undefined) return;
    ctx.commit(path, [...value, cloneItemWithFreshIds(template)]);
  };

  return (
    <div className="fe-field fe-array">
      <span className="fe-field-label">{labelFor(fieldKey, false)}</span>
      <FieldError message={ctx.errorFor(path)} />
      {value.map((item, index) => (
        <fieldset className="fe-array-item" key={pathKey([...path, index])}>
          <legend className="fe-array-item-head">
            <span>
              {labelFor(fieldKey, false)} {index + 1}
            </span>
            <span className="fe-array-item-controls">
              <button
                type="button"
                className="fe-icon-btn fe-icon-btn-sm"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                title="Move up"
                aria-label="Move item up"
              >
                <ChevronUp size={12} aria-hidden />
              </button>
              <button
                type="button"
                className="fe-icon-btn fe-icon-btn-sm"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
                title="Move down"
                aria-label="Move item down"
              >
                <ChevronDown size={12} aria-hidden />
              </button>
              <button
                type="button"
                className="fe-icon-btn fe-icon-btn-sm fe-icon-btn-danger"
                onClick={() => remove(index)}
                title="Remove"
                aria-label="Remove item"
              >
                <Trash2 size={12} aria-hidden />
              </button>
            </span>
          </legend>
          <ValueFields ctx={ctx} path={[...path, index]} value={item} />
        </fieldset>
      ))}
      <button type="button" className="fe-btn fe-btn-sm" onClick={add}>
        Add item
      </button>
    </div>
  );
}

function ValueFields({
  ctx,
  path,
  value,
}: {
  ctx: EditCtx;
  path: Path;
  value: unknown;
}): ReactElement {
  if (value === null || typeof value !== "object") {
    return <p className="fe-muted">Unsupported value.</p>;
  }
  return (
    <>
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (key === "id") return null;
        const itemPath = [...path, key];
        if (typeof item === "string" && isMediaKey(key)) {
          return (
            <MediaField key={key} ctx={ctx} path={itemPath} value={item} fieldKey={key} />
          );
        }
        if (typeof item === "string") {
          return (
            <StringField key={key} ctx={ctx} path={itemPath} value={item} fieldKey={key} />
          );
        }
        if (typeof item === "boolean") {
          return (
            <label className="fe-field fe-field-checkbox" key={key}>
              <input
                type="checkbox"
                checked={item}
                onChange={(event) => ctx.commit(itemPath, event.target.checked)}
              />
              <span>{labelFor(key, false)}</span>
              <FieldError message={ctx.errorFor(itemPath)} />
            </label>
          );
        }
        if (typeof item === "number") {
          return (
            <NumberField key={key} ctx={ctx} path={itemPath} value={item} fieldKey={key} />
          );
        }
        if (Array.isArray(item)) {
          return (
            <ArrayField key={key} ctx={ctx} path={itemPath} value={item} fieldKey={key} />
          );
        }
        if (item && typeof item === "object") {
          return (
            <fieldset className="fe-object" key={key}>
              <legend>{labelFor(key, false)}</legend>
              <ValueFields ctx={ctx} path={itemPath} value={item} />
            </fieldset>
          );
        }
        return null;
      })}
    </>
  );
}

export function GenericPayloadEditor({
  lessonId,
  block,
}: {
  lessonId: string;
  block: Block;
}): ReactElement {
  const entry = getRegistryEntry(block.family);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  const ctx: EditCtx = {
    commit: (path, value) => {
      const candidate = setAtPath(block.payload, path, value);
      try {
        const parsed = entry.validatePayload(candidate, block.variant);
        setBlockPayload(lessonId, block.id, parsed);
        setError(null);
        return true;
      } catch (validationError) {
        setError({ key: pathKey(path), message: zodMessage(validationError) });
        return false;
      }
    },
    errorFor: (path) => (error && error.key === pathKey(path) ? error.message : null),
  };

  return (
    <div className="fe-payload">
      <ValueFields ctx={ctx} path={[]} value={block.payload} />
    </div>
  );
}

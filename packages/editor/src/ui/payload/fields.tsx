// Reusable field primitives for the per-family payload editors. Every text
// field keeps a local draft so invalid edits (rejected by the dispatcher's
// validate-before-commit flow) never eat the author's keystrokes.
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button, Checkbox, IconButton, Input, Select, Textarea } from "@forge/ui";
import { RichTextField } from "../rich/RichTextField.js";

interface TextCommonProps {
  label: string;
  value: string;
  onCommit: (raw: string) => void;
  required?: boolean | undefined;
  hint?: string | undefined;
  placeholder?: string | undefined;
}

function RequiredTag({ show }: { show: boolean | undefined }): ReactElement | null {
  if (!show) return null;
  return <span className="fe-pl-required">Required</span>;
}

function Hint({ text }: { text: string | undefined }): ReactElement | null {
  if (!text) return null;
  return <span className="fe-pl-hint">{text}</span>;
}

function EmptyWarning({
  required,
  draft,
  label,
}: {
  required: boolean | undefined;
  draft: string;
  label: string;
}): ReactElement | null {
  if (!required || draft.trim() !== "") return null;
  return <span className="fe-field-error">{label} is required.</span>;
}

export function StringField({
  label,
  value,
  onCommit,
  required,
  hint,
  placeholder,
}: TextCommonProps): ReactElement {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="fe-field">
      <span className="fe-field-label">
        {label}
        <RequiredTag show={required} />
      </span>
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
      />
      <Hint text={hint} />
      <EmptyWarning required={required} draft={draft} label={label} />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onCommit,
  required,
  hint,
  placeholder,
  rows = 3,
  mono = false,
}: TextCommonProps & { rows?: number; mono?: boolean }): ReactElement {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="fe-field">
      <span className="fe-field-label">
        {label}
        <RequiredTag show={required} />
      </span>
      <Textarea
        value={draft}
        rows={rows}
        placeholder={placeholder}
        className={mono ? "fe-pl-mono" : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          onCommit(event.target.value);
        }}
      />
      <Hint text={hint} />
      <EmptyWarning required={required} draft={draft} label={label} />
    </label>
  );
}

/**
 * Sanitized rich-text fragment field, backed by TipTap. Keeps the historic
 * textarea prop surface (rows/placeholder are accepted but unused) so the
 * per-family payload editors work unchanged. Commit is validated against the
 * schema sanitizer inside RichTextField before onCommit fires.
 */
export function HtmlField({
  label,
  value,
  onCommit,
  required,
  hint,
}: TextCommonProps & { rows?: number }): ReactElement {
  return (
    <RichTextField
      label={label}
      value={value}
      onCommit={onCommit}
      required={required}
      hint={hint}
    />
  );
}

/** Raw HTML textarea escape hatch for editors that need unrendered markup. */
export function PlainHtmlField(props: TextCommonProps & { rows?: number }): ReactElement {
  return <TextAreaField {...props} />;
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  hint?: string | undefined;
}): ReactElement {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}</span>
      <Input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = Number(event.target.value);
          if (event.target.value !== "" && Number.isFinite(parsed)) onCommit(parsed);
        }}
      />
      <Hint text={hint} />
    </label>
  );
}

export function ToggleField({
  label,
  checked,
  onCommit,
}: {
  label: string;
  checked: boolean;
  onCommit: (checked: boolean) => void;
}): ReactElement {
  return (
    <Checkbox
      className="fe-field fe-field-checkbox"
      label={label}
      checked={checked}
      onChange={(event) => onCommit(event.target.checked)}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  options,
  onCommit,
  hint,
}: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onCommit: (value: string) => void;
  hint?: string | undefined;
}): ReactElement {
  const known = options.some((option) => option.value === value);
  return (
    <label className="fe-field">
      <span className="fe-field-label">{label}</span>
      <Select value={value} onChange={(event) => onCommit(event.target.value)}>
        {known ? null : (
          <option value={value}>{value === "" ? "Choose..." : `Unknown (${value})`}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Hint text={hint} />
    </label>
  );
}

/**
 * Generic add/remove/move list wrapper. Rows are keyed by item id so field
 * drafts follow their item through reorders. New items must be created with
 * fresh ulid ids by the caller.
 */
export function ItemListEditor<T extends { id: string }>({
  label,
  itemLabel,
  items,
  onCommit,
  renderItem,
  createItem,
  addLabel,
  minItems = 0,
  extraAdd,
}: {
  label: string;
  itemLabel: string;
  items: readonly T[];
  onCommit: (items: T[]) => void;
  renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
  createItem?: (() => NoInfer<T>) | undefined;
  addLabel?: string | undefined;
  minItems?: number | undefined;
  /** Custom add control (e.g. media-picker driven); receives an append fn. */
  extraAdd?: ((append: (item: NoInfer<T>) => void) => ReactNode) | undefined;
}): ReactElement {
  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    onCommit(next);
  };

  const append = (item: T): void => onCommit([...items, item]);

  return (
    <div className="fe-field fe-array">
      <span className="fe-field-label">{label}</span>
      {items.map((item, index) => (
        <fieldset className="fe-array-item" key={item.id}>
          <legend className="fe-array-item-head">
            <span>
              {itemLabel} {index + 1}
            </span>
            <span className="fe-array-item-controls">
              <IconButton
                icon={<ChevronUp size={12} aria-hidden />}
                label={`Move ${itemLabel.toLowerCase()} up`}
                title="Move up"
                size="sm"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              />
              <IconButton
                icon={<ChevronDown size={12} aria-hidden />}
                label={`Move ${itemLabel.toLowerCase()} down`}
                title="Move down"
                size="sm"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
              />
              <IconButton
                icon={<Trash2 size={12} aria-hidden />}
                label={`Remove ${itemLabel.toLowerCase()}`}
                title="Remove"
                size="sm"
                variant="danger"
                onClick={() => onCommit(items.filter((_, i) => i !== index))}
                disabled={items.length <= minItems}
              />
            </span>
          </legend>
          {renderItem(
            item,
            (next) => onCommit(items.map((existing, i) => (i === index ? next : existing))),
            index,
          )}
        </fieldset>
      ))}
      {createItem ? (
        <Button size="sm" onClick={() => append(createItem())}>
          {addLabel ?? `Add ${itemLabel.toLowerCase()}`}
        </Button>
      ) : null}
      {extraAdd ? extraAdd(append) : null}
    </div>
  );
}

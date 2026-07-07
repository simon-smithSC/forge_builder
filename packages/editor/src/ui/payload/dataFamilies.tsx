// Purpose-built editors for the data families: chart and table.
import type { ReactElement } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { Block } from "@forge/schema";
import { createUlid } from "@forge/schema";
import {
  HtmlField,
  ItemListEditor,
  NumberField,
  SelectField,
  StringField,
  ToggleField,
} from "./fields.js";
import type { FamilyEditorProps } from "./types.js";
import { setOptional } from "./types.js";

type TablePayload = Extract<Block, { family: "table" }>["payload"];

export function ChartEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "chart") return null;
  const payload = block.payload;

  return (
    <>
      <StringField
        label="Chart title"
        value={payload.title ?? ""}
        placeholder="Optional title"
        onCommit={(raw) => onChange(setOptional(payload, "title", raw))}
      />
      <ItemListEditor
        label="Data points"
        itemLabel="Data point"
        items={payload.items}
        minItems={1}
        onCommit={(items) => onChange({ ...payload, items })}
        createItem={() => ({ id: createUlid(), label: "New item", value: 0 })}
        renderItem={(item, update) => (
          <>
            <StringField
              label="Label"
              value={item.label}
              required
              onCommit={(raw) => update({ ...item, label: raw })}
            />
            <NumberField
              label="Value"
              value={item.value}
              onCommit={(value) => update({ ...item, value })}
            />
            <StringField
              label="Color"
              value={item.color ?? ""}
              placeholder="Optional, e.g. #1f6feb"
              hint="Hex color like #1f6feb, or a var(--token)."
              onCommit={(raw) => update(setOptional(item, "color", raw))}
            />
          </>
        )}
      />
      <StringField
        label="X axis label"
        value={payload.xAxisLabel ?? ""}
        placeholder="Optional"
        onCommit={(raw) => onChange(setOptional(payload, "xAxisLabel", raw))}
      />
      <StringField
        label="Y axis label"
        value={payload.yAxisLabel ?? ""}
        placeholder="Optional"
        onCommit={(raw) => onChange(setOptional(payload, "yAxisLabel", raw))}
      />
      {block.variant === "line" ? (
        <SelectField
          label="Curve type"
          value={payload.curveType ?? ""}
          options={[
            { value: "", label: "Default" },
            { value: "linear", label: "Linear" },
            { value: "monotone", label: "Monotone (smooth)" },
            { value: "step", label: "Step" },
          ]}
          onCommit={(raw) => onChange(setOptional(payload, "curveType", raw))}
        />
      ) : null}
    </>
  );
}

/**
 * Column operations keep every row's cells in sync with the column list so
 * each cell's columnId always references a known column (enforced by the
 * table schema's superRefine).
 */
function ColumnListEditor({
  payload,
  onChange,
}: {
  payload: TablePayload;
  onChange: (payload: unknown) => void;
}): ReactElement {
  const { columns, rows } = payload;

  const addColumn = (): void => {
    const columnId = createUlid();
    onChange({
      ...payload,
      columns: [...columns, { id: columnId, html: "Header" }],
      rows: rows.map((row) => ({
        ...row,
        cells: [...row.cells, { id: createUlid(), columnId, html: "Cell" }],
      })),
    });
  };

  const removeColumn = (index: number): void => {
    const column = columns[index];
    if (!column || columns.length <= 1) return;
    onChange({
      ...payload,
      columns: columns.filter((_, i) => i !== index),
      rows: rows.map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => cell.columnId !== column.id),
      })),
    });
  };

  const moveColumn = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    const order = new Map(next.map((column, i) => [column.id, i]));
    onChange({
      ...payload,
      columns: next,
      rows: rows.map((row) => ({
        ...row,
        cells: [...row.cells].sort(
          (x, y) =>
            (order.get(x.columnId) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(y.columnId) ?? Number.MAX_SAFE_INTEGER),
        ),
      })),
    });
  };

  return (
    <div className="fe-field fe-array">
      <span className="fe-field-label">Columns</span>
      {columns.map((column, index) => (
        <fieldset className="fe-array-item" key={column.id}>
          <legend className="fe-array-item-head">
            <span>Column {index + 1}</span>
            <span className="fe-array-item-controls">
              <button
                type="button"
                className="fe-icon-btn fe-icon-btn-sm"
                onClick={() => moveColumn(index, -1)}
                disabled={index === 0}
                title="Move left"
                aria-label="Move column left"
              >
                <ChevronUp size={12} aria-hidden />
              </button>
              <button
                type="button"
                className="fe-icon-btn fe-icon-btn-sm"
                onClick={() => moveColumn(index, 1)}
                disabled={index === columns.length - 1}
                title="Move right"
                aria-label="Move column right"
              >
                <ChevronDown size={12} aria-hidden />
              </button>
              <button
                type="button"
                className="fe-icon-btn fe-icon-btn-sm fe-icon-btn-danger"
                onClick={() => removeColumn(index)}
                disabled={columns.length <= 1}
                title="Remove column"
                aria-label="Remove column"
              >
                <Trash2 size={12} aria-hidden />
              </button>
            </span>
          </legend>
          <HtmlField
            label="Column header (HTML)"
            value={column.html}
            required
            rows={2}
            onCommit={(raw) =>
              onChange({
                ...payload,
                columns: columns.map((existing, i) =>
                  i === index ? { ...existing, html: raw } : existing,
                ),
              })
            }
          />
        </fieldset>
      ))}
      <button type="button" className="fe-btn fe-btn-sm" onClick={addColumn}>
        Add column
      </button>
    </div>
  );
}

export function TableEditor({ block, onChange }: FamilyEditorProps): ReactElement | null {
  if (block.family !== "table") return null;
  const payload = block.payload;

  return (
    <>
      <StringField
        label="Caption"
        value={payload.caption ?? ""}
        placeholder="Optional table caption"
        onCommit={(raw) => onChange(setOptional(payload, "caption", raw))}
      />
      <ToggleField
        label="Header row"
        checked={payload.headerRow}
        onCommit={(headerRow) => onChange({ ...payload, headerRow })}
      />
      <ToggleField
        label="Header column"
        checked={payload.headerColumn}
        onCommit={(headerColumn) => onChange({ ...payload, headerColumn })}
      />
      <ColumnListEditor payload={payload} onChange={onChange} />
      <ItemListEditor
        label="Rows"
        itemLabel="Row"
        items={payload.rows}
        minItems={1}
        onCommit={(rows) => onChange({ ...payload, rows })}
        createItem={() => ({
          id: createUlid(),
          cells: payload.columns.map((column) => ({
            id: createUlid(),
            columnId: column.id,
            html: "Cell",
          })),
        })}
        renderItem={(row, update) => (
          <>
            {payload.columns.map((column, colIndex) => {
              const cell = row.cells.find((c) => c.columnId === column.id);
              if (!cell) {
                return (
                  <button
                    key={column.id}
                    type="button"
                    className="fe-btn fe-btn-sm"
                    onClick={() =>
                      update({
                        ...row,
                        cells: [
                          ...row.cells,
                          { id: createUlid(), columnId: column.id, html: "Cell" },
                        ],
                      })
                    }
                  >
                    Add missing cell for column {colIndex + 1}
                  </button>
                );
              }
              return (
                <HtmlField
                  key={cell.id}
                  label={`Column ${colIndex + 1} cell (HTML)`}
                  value={cell.html}
                  required
                  rows={2}
                  onCommit={(raw) =>
                    update({
                      ...row,
                      cells: row.cells.map((existing) =>
                        existing.id === cell.id ? { ...existing, html: raw } : existing,
                      ),
                    })
                  }
                />
              );
            })}
          </>
        )}
      />
    </>
  );
}

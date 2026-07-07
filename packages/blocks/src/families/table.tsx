import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { Html } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type TableBlock =
  | BlockFor<"table", "basic">
  | BlockFor<"table", "header row/col options">;

/**
 * Both variants share the renderer; header row/column behavior lives in the
 * payload (headerRow / headerColumn flags).
 */
function TableRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as TableBlock;
  const p = b.payload;
  return (
    <div className="fb-table-wrapper">
      <table className="fb-table">
        {p.caption ? <caption className="fb-table-caption">{p.caption}</caption> : null}
        {p.headerRow ? (
          <thead>
            <tr>
              {p.columns.map((column) => (
                <th key={column.id} scope="col">
                  <Html fragment={column.html} />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {p.rows.map((row) => (
            <tr key={row.id}>
              {p.columns.map((column, columnIndex) => {
                const cell = row.cells.find((c) => c.columnId === column.id);
                if (!cell) return <td key={column.id} />;
                const content = <Html fragment={cell.html} />;
                return p.headerColumn && columnIndex === 0 ? (
                  <th key={column.id} scope="row">
                    {content}
                  </th>
                ) : (
                  <td key={column.id}>{content}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const tableEntry: BlockRegistryEntry = {
  family: "table",
  variants: variantsOf("table"),
  palette: {
    label: "Table",
    group: "data",
    description: "Data tables with optional header row and column.",
    icon: "table",
  },
  createDefaultPayload: () => ({
    headerRow: true,
    headerColumn: false,
    columns: [
      { id: "col-1", html: "<p>Column 1</p>" },
      { id: "col-2", html: "<p>Column 2</p>" },
    ],
    rows: [
      {
        id: "row-1",
        cells: [
          { id: "cell-1-1", columnId: "col-1", html: "<p>Cell</p>" },
          { id: "cell-1-2", columnId: "col-2", html: "<p>Cell</p>" },
        ],
      },
      {
        id: "row-2",
        cells: [
          { id: "cell-2-1", columnId: "col-1", html: "<p>Cell</p>" },
          { id: "cell-2-2", columnId: "col-2", html: "<p>Cell</p>" },
        ],
      },
    ],
  }),
  validatePayload: (payload, variant) => validateWithSchema("table", variant, payload),
  Renderer: TableRendererImpl,
};

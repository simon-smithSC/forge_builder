import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ChartBlock =
  | BlockFor<"chart", "bar">
  | BlockFor<"chart", "line">
  | BlockFor<"chart", "pie">;

type ChartItem = ChartBlock["payload"]["items"][number];

// Default series derive from the course theme (Rise charts are theme-bound,
// teardown Chart, lines 907-946); later series fall back to fixed hues.
const FALLBACK_COLORS = [
  "var(--fb-primary)",
  "var(--fb-accent)",
  "#2da44e",
  "#8250df",
  "#cf222e",
  "#bf8700",
  "#0969da",
  "#57606a",
] as const;

function colorFor(item: ChartItem, index: number): string {
  return (
    item.color ??
    FALLBACK_COLORS[index % FALLBACK_COLORS.length] ??
    "var(--fb-primary)"
  );
}

const LEFT = 50;
const TOP = 20;
const INNER_W = 570;
const INNER_H = 260;

function AxisLabels({
  xAxisLabel,
  yAxisLabel,
}: {
  xAxisLabel?: string | undefined;
  yAxisLabel?: string | undefined;
}): ReactElement {
  return (
    <>
      {xAxisLabel ? (
        <text
          x={LEFT + INNER_W / 2}
          y={352}
          textAnchor="middle"
          fontSize={13}
          fill="currentColor"
        >
          {xAxisLabel}
        </text>
      ) : null}
      {yAxisLabel ? (
        <text
          x={14}
          y={TOP + INNER_H / 2}
          textAnchor="middle"
          fontSize={13}
          fill="currentColor"
          transform={`rotate(-90 14 ${TOP + INNER_H / 2})`}
        >
          {yAxisLabel}
        </text>
      ) : null}
    </>
  );
}

function BarChartSvg({ payload }: { payload: ChartBlock["payload"] }): ReactElement {
  const items = payload.items;
  const max = Math.max(1, ...items.map((item) => item.value));
  const band = INNER_W / items.length;
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={`Bar chart${payload.title ? `: ${payload.title}` : ""}`}
      className="fb-chart-svg"
    >
      <line
        x1={LEFT}
        y1={TOP + INNER_H}
        x2={LEFT + INNER_W}
        y2={TOP + INNER_H}
        stroke="currentColor"
        opacity={0.3}
      />
      {items.map((item, index) => {
        const height = (Math.max(0, item.value) / max) * INNER_H;
        const x = LEFT + index * band + band * 0.15;
        const width = band * 0.7;
        const y = TOP + INNER_H - height;
        return (
          <g key={item.id}>
            <rect x={x} y={y} width={width} height={height} rx={4} fill={colorFor(item, index)} />
            <text
              x={x + width / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
            >
              {item.value}
            </text>
            <text
              x={x + width / 2}
              y={TOP + INNER_H + 18}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
            >
              {item.label}
            </text>
          </g>
        );
      })}
      <AxisLabels xAxisLabel={payload.xAxisLabel} yAxisLabel={payload.yAxisLabel} />
    </svg>
  );
}

function LineChartSvg({ payload }: { payload: ChartBlock["payload"] }): ReactElement {
  const items = payload.items;
  const max = Math.max(1, ...items.map((item) => item.value));
  const points = items.map((item, index) => ({
    x:
      LEFT +
      (items.length === 1 ? INNER_W / 2 : (index * INNER_W) / (items.length - 1)),
    y: TOP + INNER_H - (Math.max(0, item.value) / max) * INNER_H,
    item,
    index,
  }));
  let d = "";
  if (payload.curveType === "step") {
    for (const [pointIndex, point] of points.entries()) {
      d +=
        pointIndex === 0
          ? `M ${point.x} ${point.y}`
          : ` H ${point.x} V ${point.y}`;
    }
  } else {
    for (const [pointIndex, point] of points.entries()) {
      d += pointIndex === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`;
    }
  }
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={`Line chart${payload.title ? `: ${payload.title}` : ""}`}
      className="fb-chart-svg"
    >
      <line
        x1={LEFT}
        y1={TOP + INNER_H}
        x2={LEFT + INNER_W}
        y2={TOP + INNER_H}
        stroke="currentColor"
        opacity={0.3}
      />
      <path d={d} fill="none" stroke="var(--fb-primary)" strokeWidth={2.5} />
      {points.map((point) => (
        <g key={point.item.id}>
          <circle cx={point.x} cy={point.y} r={4} fill="var(--fb-primary)" />
          <text
            x={point.x}
            y={point.y - 10}
            textAnchor="middle"
            fontSize={12}
            fill="currentColor"
          >
            {point.item.value}
          </text>
          <text
            x={point.x}
            y={TOP + INNER_H + 18}
            textAnchor="middle"
            fontSize={12}
            fill="currentColor"
          >
            {point.item.label}
          </text>
        </g>
      ))}
      <AxisLabels xAxisLabel={payload.xAxisLabel} yAxisLabel={payload.yAxisLabel} />
    </svg>
  );
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function PieChartSvg({ payload }: { payload: ChartBlock["payload"] }): ReactElement {
  const items = payload.items;
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  let angle = -Math.PI / 2;
  const slices = items.map((item, index) => {
    const fraction = total > 0 ? Math.max(0, item.value) / total : 0;
    const start = angle;
    const end = angle + fraction * Math.PI * 2;
    angle = end;
    return { item, index, start, end, fraction };
  });
  return (
    <div className="fb-chart-pie">
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label={`Pie chart${payload.title ? `: ${payload.title}` : ""}`}
        className="fb-chart-svg fb-chart-pie-svg"
      >
        {slices.map((slice) =>
          slice.fraction <= 0 ? null : slice.fraction >= 0.9999 ? (
            <circle
              key={slice.item.id}
              cx={150}
              cy={150}
              r={120}
              fill={colorFor(slice.item, slice.index)}
            />
          ) : (
            <path
              key={slice.item.id}
              d={arcPath(150, 150, 120, slice.start, slice.end)}
              fill={colorFor(slice.item, slice.index)}
            />
          ),
        )}
      </svg>
      <ul className="fb-chart-legend">
        {items.map((item, index) => (
          <li key={item.id} className="fb-chart-legend-item">
            <span
              className="fb-chart-legend-swatch"
              style={{ backgroundColor: colorFor(item, index) }}
              aria-hidden="true"
            />
            <span>
              {item.label}: {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ChartBlock;
  const [showTable, setShowTable] = useState(false);
  const p = b.payload;
  return (
    <div className={`fb-chart fb-chart-${b.variant}`}>
      {p.title ? <h3 className="fb-chart-title">{p.title}</h3> : null}
      {b.variant === "bar" ? (
        <BarChartSvg payload={p} />
      ) : b.variant === "line" ? (
        <LineChartSvg payload={p} />
      ) : (
        <PieChartSvg payload={p} />
      )}
      <button
        type="button"
        className="fb-chart-table-toggle"
        aria-expanded={showTable}
        onClick={() => setShowTable(!showTable)}
      >
        {showTable ? "Hide data table" : "Show data table"}
      </button>
      {showTable ? (
        <table className="fb-chart-table">
          <caption>{p.title ?? "Chart data"}</caption>
          <thead>
            <tr>
              <th scope="col">{p.xAxisLabel ?? "Label"}</th>
              <th scope="col">{p.yAxisLabel ?? "Value"}</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((item) => (
              <tr key={item.id}>
                <th scope="row">{item.label}</th>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export const chartEntry: BlockRegistryEntry = {
  family: "chart",
  variants: variantsOf("chart"),
  palette: {
    label: "Chart",
    group: "data",
    description: "Bar, line, and pie charts with an accessible data table.",
    icon: "bar-chart",
  },
  createDefaultPayload: () => ({
    items: [
      { id: "item-1", label: "A", value: 4 },
      { id: "item-2", label: "B", value: 7 },
      { id: "item-3", label: "C", value: 3 },
    ],
  }),
  validatePayload: (payload, variant) => validateWithSchema("chart", variant, payload),
  Renderer: ChartRendererImpl,
};

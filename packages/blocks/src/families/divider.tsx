import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type DividerBlock =
  | BlockFor<"divider", "line">
  | BlockFor<"divider", "numbered">
  | BlockFor<"divider", "spacer">
  | BlockFor<"divider", "continue button">
  | BlockFor<"divider", "screen bar">;

function DividerRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as DividerBlock;
  const { mode, events, labels, consumedBlockIds } = useRenderContext();
  const [clicked, setClicked] = useState(false);

  switch (b.variant) {
    case "line":
      return <hr className={`fb-divider-line fb-divider-line-${b.payload.style}`} />;
    case "numbered":
      return (
        <div className="fb-divider-numbered">
          <span className="fb-divider-number">{b.payload.number}</span>
          {b.payload.label ? (
            <span className="fb-divider-number-label">{b.payload.label}</span>
          ) : null}
        </div>
      );
    case "spacer":
      return (
        <div
          className={`fb-divider-spacer fb-divider-spacer-${b.payload.size}`}
          aria-hidden="true"
        />
      );
    case "continue button": {
      const done = clicked || consumedBlockIds.has(b.id);
      return (
        <div className="fb-divider-continue">
          <button
            type="button"
            className={`fb-divider-continue-button${done ? " fb-divider-continue-done" : ""}`}
            disabled={done}
            onClick={() => {
              setClicked(true);
              if (mode === "player") events.onCompleted?.(b.id);
            }}
          >
            {done ? `✓ ${labels.complete}` : b.payload.label}
          </button>
        </div>
      );
    }
    case "screen bar":
      return <div className="fb-divider-screenbar" aria-hidden="true" />;
  }
}

const defaults: Record<string, () => unknown> = {
  line: () => ({ style: "solid" }),
  numbered: () => ({ number: 1 }),
  spacer: () => ({ size: "medium" }),
  "continue button": () => ({ label: "Continue" }),
  "screen bar": () => ({}),
};

export const dividerEntry: BlockRegistryEntry = {
  family: "divider",
  variants: variantsOf("divider"),
  palette: {
    label: "Divider",
    group: "structure",
    description: "Lines, numbered steps, spacers, and continue buttons.",
    icon: "minus",
  },
  createDefaultPayload: (variant) => {
    const factory = defaults[variant];
    if (!factory) throw new Error(`Unknown divider variant "${variant}".`);
    return factory();
  },
  validatePayload: (payload, variant) => validateWithSchema("divider", variant, payload),
  Renderer: DividerRendererImpl,
};

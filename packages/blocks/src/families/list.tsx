import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ListBlock =
  | BlockFor<"list", "bulleted">
  | BlockFor<"list", "numbered">
  | BlockFor<"list", "checkboxes">;

function ListRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ListBlock;
  const { mode, events } = useRenderContext();
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        b.payload.items.filter((item) => item.checked).map((item) => item.id),
      ),
  );

  if (b.variant === "checkboxes") {
    return (
      <ul className="fb-list fb-list-checkboxes">
        {b.payload.items.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <li key={item.id} className="fb-list-checkbox-item">
              <label className="fb-list-checkbox-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const next = new Set(checked);
                    if (isChecked) next.delete(item.id);
                    else next.add(item.id);
                    setChecked(next);
                    if (mode === "player") {
                      events.onInteracted?.(b.id, {
                        itemId: item.id,
                        checked: !isChecked,
                      });
                    }
                  }}
                />
                <Html fragment={item.html} className="fb-list-item-html" />
              </label>
            </li>
          );
        })}
      </ul>
    );
  }

  const ListTag = b.variant === "numbered" ? "ol" : "ul";
  return (
    <ListTag className={`fb-list fb-list-${b.variant}`}>
      {b.payload.items.map((item) => (
        <li key={item.id}>
          <Html fragment={item.html} className="fb-list-item-html" />
        </li>
      ))}
    </ListTag>
  );
}

export const listEntry: BlockRegistryEntry = {
  family: "list",
  variants: variantsOf("list"),
  palette: {
    label: "List",
    group: "text",
    description: "Bulleted, numbered, and checkbox lists.",
    icon: "list",
  },
  createDefaultPayload: () => ({
    items: [
      { id: "item-1", html: "<p>First item</p>" },
      { id: "item-2", html: "<p>Second item</p>" },
      { id: "item-3", html: "<p>Third item</p>" },
    ],
  }),
  validatePayload: (payload, variant) => validateWithSchema("list", variant, payload),
  Renderer: ListRendererImpl,
};

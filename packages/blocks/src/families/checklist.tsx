import type { ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ChecklistBlock = BlockFor<"checklist", "task checklist">;

function ChecklistRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ChecklistBlock;
  const { mode, events } = useRenderContext();
  const items = b.payload.items;
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () =>
      new Set(items.filter((item) => item.initiallyChecked).map((item) => item.id)),
  );
  const [reported, setReported] = useState(false);

  const toggle = (itemId: string) => {
    const isChecked = checked.has(itemId);
    const next = new Set(checked);
    if (isChecked) next.delete(itemId);
    else next.add(itemId);
    setChecked(next);
    if (mode === "player") {
      events.onInteracted?.(b.id, { itemId, checked: !isChecked });
      if (next.size === items.length && !reported) {
        setReported(true);
        events.onCompleted?.(b.id);
      }
    }
  };

  return (
    <div className="fb-checklist">
      {b.payload.requiredForCompletion ? (
        <span className="fb-checklist-required">Required</span>
      ) : null}
      <ul className="fb-checklist-items">
        {items.map((item) => (
          <li key={item.id} className="fb-checklist-item">
            <label className="fb-checklist-label">
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => toggle(item.id)}
              />
              <Html fragment={item.html} className="fb-checklist-item-html" />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const checklistEntry: BlockRegistryEntry = {
  family: "checklist",
  variants: variantsOf("checklist"),
  palette: {
    label: "Checklist",
    group: "interactive",
    description: "Task checklists learners tick off.",
    icon: "check-square",
  },
  createDefaultPayload: () => ({
    requiredForCompletion: false,
    items: [
      { id: "item-1", html: "<p>First task</p>" },
      { id: "item-2", html: "<p>Second task</p>" },
      { id: "item-3", html: "<p>Third task</p>" },
    ],
  }),
  validatePayload: (payload, variant) =>
    validateWithSchema("checklist", variant, payload),
  Renderer: ChecklistRendererImpl,
};

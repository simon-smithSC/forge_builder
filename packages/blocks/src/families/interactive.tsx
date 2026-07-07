import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from "react";
import { useState } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import { Html, MediaPlaceholder } from "../html.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type InteractiveBlock =
  | BlockFor<"interactive", "accordion">
  | BlockFor<"interactive", "tabs">;

type InteractiveItem = InteractiveBlock["payload"]["items"][number];

function ItemBody({ item }: { item: InteractiveItem }): ReactElement {
  const { resolveMediaUrl } = useRenderContext();
  const imageUrl = item.imageMediaId ? resolveMediaUrl(item.imageMediaId) : undefined;
  const audioUrl = item.audioMediaId ? resolveMediaUrl(item.audioMediaId) : undefined;
  return (
    <div className="fb-interactive-body">
      {item.imageMediaId ? (
        imageUrl ? (
          <img src={imageUrl} alt="" className="fb-interactive-image" />
        ) : (
          <MediaPlaceholder label={item.title} />
        )
      ) : null}
      <Html fragment={item.html} />
      {audioUrl ? (
        <audio controls src={audioUrl} className="fb-interactive-audio" />
      ) : null}
    </div>
  );
}

function AccordionView({ block }: { block: InteractiveBlock }): ReactElement {
  const { mode, events } = useRenderContext();
  const [openId, setOpenId] = useState<string | null>(null);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const items = block.payload.items;

  const toggle = (itemId: string) => {
    const willOpen = openId !== itemId;
    setOpenId(willOpen ? itemId : null);
    if (willOpen && mode === "player") {
      const next = new Set(opened);
      next.add(itemId);
      setOpened(next);
      events.onInteracted?.(block.id, { itemId });
      if (next.size === items.length && !completed) {
        setCompleted(true);
        events.onCompleted?.(block.id);
      }
    }
  };

  return (
    <div className="fb-interactive fb-interactive-accordion">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const headerId = `${block.id}-header-${item.id}`;
        const panelId = `${block.id}-panel-${item.id}`;
        return (
          <div key={item.id} className="fb-interactive-accordion-item">
            <h3 className="fb-interactive-accordion-heading">
              <button
                type="button"
                id={headerId}
                className="fb-interactive-accordion-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span>{item.title}</span>
                <span className="fb-interactive-chevron" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="fb-interactive-accordion-panel"
              >
                <ItemBody item={item} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TabsView({ block }: { block: InteractiveBlock }): ReactElement {
  const { mode, events } = useRenderContext();
  const items = block.payload.items;
  const first = items[0];
  const [activeId, setActiveId] = useState<string>(first ? first.id : "");
  const [visited, setVisited] = useState<ReadonlySet<string>>(
    () => new Set(first ? [first.id] : []),
  );
  const [completed, setCompleted] = useState(false);

  const tabId = (itemId: string): string => `${block.id}-tab-${itemId}`;
  const panelId = (itemId: string): string => `${block.id}-tabpanel-${itemId}`;

  const select = (itemId: string) => {
    setActiveId(itemId);
    if (mode === "player") {
      const next = new Set(visited);
      next.add(itemId);
      setVisited(next);
      events.onInteracted?.(block.id, { itemId });
      if (next.size === items.length && !completed) {
        setCompleted(true);
        events.onCompleted?.(block.id);
      }
    }
  };

  const onKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = items[nextIndex];
    if (!next) return;
    select(next.id);
    document.getElementById(tabId(next.id))?.focus();
  };

  const active = items.find((item) => item.id === activeId) ?? first;

  return (
    <div className="fb-interactive fb-interactive-tabs">
      <div role="tablist" className="fb-interactive-tablist">
        {items.map((item, index) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId(item.id)}
              className={`fb-interactive-tab${isActive ? " fb-interactive-tab-active" : ""}`}
              aria-selected={isActive}
              aria-controls={panelId(item.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.title}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={panelId(active.id)}
          aria-labelledby={tabId(active.id)}
          tabIndex={0}
          className="fb-interactive-tabpanel"
        >
          <ItemBody item={active} />
        </div>
      ) : null}
    </div>
  );
}

function InteractiveRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as InteractiveBlock;
  return b.variant === "tabs" ? <TabsView block={b} /> : <AccordionView block={b} />;
}

export const interactiveEntry: BlockRegistryEntry = {
  family: "interactive",
  variants: variantsOf("interactive"),
  palette: {
    label: "Interactive",
    group: "interactive",
    description: "Accordions and tabs that reveal content step by step.",
    icon: "list-collapse",
  },
  createDefaultPayload: () => ({
    items: [
      { id: "item-1", title: "First item", html: "<p>Content for the first item.</p>" },
      { id: "item-2", title: "Second item", html: "<p>Content for the second item.</p>" },
    ],
  }),
  validatePayload: (payload, variant) =>
    validateWithSchema("interactive", variant, payload),
  Renderer: InteractiveRendererImpl,
};

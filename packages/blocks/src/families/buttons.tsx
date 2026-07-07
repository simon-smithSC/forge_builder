import type { ReactElement } from "react";
import type { BlockFor } from "@forge/schema";
import { useRenderContext } from "../context.js";
import type { BlockRegistryEntry, BlockRendererProps } from "../registry.js";
import { validateWithSchema, variantsOf } from "../registry.js";

type ButtonsBlock =
  | BlockFor<"buttons", "single button">
  | BlockFor<"buttons", "button stack">;

type ForgeButton = ButtonsBlock["payload"]["buttons"][number];

function ButtonItem({ button }: { button: ForgeButton }): ReactElement {
  const { events } = useRenderContext();
  const destination = button.destination;
  if (destination.type === "lesson") {
    const lessonId = destination.lessonId;
    return (
      <button
        type="button"
        className="fb-buttons-button"
        onClick={() => events.onNavigateToLesson?.(lessonId)}
      >
        {button.label}
      </button>
    );
  }
  if (destination.type === "mailto") {
    const href = destination.subject
      ? `mailto:${destination.email}?subject=${encodeURIComponent(destination.subject)}`
      : `mailto:${destination.email}`;
    return (
      <a className="fb-buttons-button" href={href}>
        {button.label}
      </a>
    );
  }
  return (
    <a
      className="fb-buttons-button"
      href={destination.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {button.label}
    </a>
  );
}

function ButtonsRendererImpl({ block }: BlockRendererProps): ReactElement {
  const b = block as ButtonsBlock;
  const variantClass =
    b.variant === "single button" ? "fb-buttons-single" : "fb-buttons-stack";
  return (
    <div className={`fb-buttons ${variantClass}`}>
      {b.payload.buttons.map((button) => (
        <ButtonItem key={button.id} button={button} />
      ))}
    </div>
  );
}

export const buttonsEntry: BlockRegistryEntry = {
  family: "buttons",
  variants: variantsOf("buttons"),
  palette: {
    label: "Buttons",
    group: "interactive",
    description: "Links, mailto buttons, and lesson navigation.",
    icon: "mouse-pointer-click",
  },
  createDefaultPayload: () => ({
    buttons: [
      {
        id: "button-1",
        label: "Learn more",
        destination: { type: "url", url: "https://example.com" },
      },
    ],
  }),
  validatePayload: (payload, variant) =>
    validateWithSchema("buttons", variant, payload),
  Renderer: ButtonsRendererImpl,
};

// Motion primitives: Presence (exit orchestration) and Collapse (height).
// Popover, Dialog and Toast consume Presence internally, so their exits are
// demoed live in the Surfaces section; this section shows the raw primitives.
import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "../components/Button.js";
import { Collapse } from "../components/Collapse.js";
import { Presence } from "../components/Presence.js";
import { DemoRow, Mono, Section, Spec } from "./shared.js";

// Demo-only exit styling: real components ship their own [data-state="closed"]
// rules in components.css; the specimen card needs a local pair.
const demoCss = `
.an-sg-presence-card {
  width: 15rem;
  padding: var(--an-space-12) var(--an-space-16);
  background: var(--an-surface-overlay);
  border-radius: var(--an-radius-lg);
  box-shadow: var(--an-elevation-3);
  animation: an-rise-in var(--an-duration-200) var(--an-ease-enter);
  transition:
    opacity var(--an-duration-160) var(--an-ease-exit),
    transform var(--an-duration-160) var(--an-ease-exit);
}
.an-sg-presence-card[data-state="closed"] {
  opacity: 0;
  transform: translateY(0.25rem) scale(0.97);
}
`;

export function MotionSection(): ReactElement {
  const [cardOpen, setCardOpen] = useState(true);
  const [collapseOpen, setCollapseOpen] = useState(true);

  return (
    <Section
      id="motion"
      title="Motion primitives"
      lede="CSS owns enters; Presence owns exits. A node held by Presence gets data-state='open' on mount (its entrance keyframe fires as usual) and data-state='closed' when dismissed, staying in the tree until its exit transition ends. Collapse animates measured heights between 0 and auto. Reduced motion zeroes the duration tokens, and both primitives probe for that and skip straight to the final state."
    >
      <style>{demoCss}</style>
      <Spec
        title="Presence"
        anatomy="Render prop receives { ref, data-state }; spread both onto the node. Unmounts on transitionend/animationend (filtered to the node itself) or a 400ms ceiling; reopening mid-exit reverses the transition in place."
        doText="Style exits on [data-state='closed'] with duration/ease tokens only; enters stay pure CSS keyframes."
        dontText="No JS-driven enter choreography, and no exit styling on descendants only — the Presence node itself must transition or the unmount fires at the timeout ceiling."
      >
        <DemoRow label="Demo" style={{ alignItems: "flex-start" }}>
          <Button variant="secondary" onClick={() => setCardOpen((v) => !v)}>
            {cardOpen ? "Dismiss card" : "Show card"}
          </Button>
          <div style={{ minHeight: "5.5rem" }}>
            <Presence open={cardOpen}>
              {(presence) => (
                <div
                  ref={presence.ref}
                  data-state={presence["data-state"]}
                  className="an-sg-presence-card"
                >
                  <strong>Really mounted</strong>
                  <div
                    className="an-type-paragraph-small"
                    style={{ color: "var(--an-text-secondary)" }}
                  >
                    This card leaves the DOM only after its exit transition
                    finishes. <Mono>data-state</Mono> drives the CSS.
                  </div>
                </div>
              )}
            </Presence>
          </div>
        </DemoRow>
      </Spec>

      <Spec
        title="Collapse"
        anatomy="A div with overflow hidden whose height transitions 0 to measured px to auto (duration-200, ease-standard). Closed content is aria-hidden and inert; keepMounted={false} unmounts it after the exit."
        doText="Use for banners and disclosure rows where siblings must glide, not jump."
        dontText="No animating margin/padding on the collapsing node itself; put spacing on a wrapper so the measured height stays honest."
      >
        <DemoRow label="Demo" style={{ alignItems: "flex-start" }}>
          <Button variant="secondary" onClick={() => setCollapseOpen((v) => !v)}>
            {collapseOpen ? "Collapse" : "Expand"}
          </Button>
          <div style={{ width: "18rem" }}>
            <Collapse open={collapseOpen}>
              <div
                style={{
                  padding: "var(--an-space-12) var(--an-space-16)",
                  background: "var(--an-surface-raised)",
                  borderRadius: "var(--an-radius-lg)",
                  boxShadow: "var(--an-elevation-1)",
                }}
              >
                <strong>Restored from draft</strong>
                <div
                  className="an-type-paragraph-small"
                  style={{ color: "var(--an-text-secondary)" }}
                >
                  Height animates between 0 and auto via measured pixels, so
                  the layout below glides as this banner comes and goes.
                </div>
              </div>
            </Collapse>
          </div>
        </DemoRow>
      </Spec>
    </Section>
  );
}

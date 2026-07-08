import type { ReactElement } from "react";
import { Section } from "./shared.js";

interface Pair {
  topic: string;
  doText: string;
  dontText: string;
}

const PAIRS: Pair[] = [
  {
    topic: "Tokens",
    doText:
      "Consume semantic tokens (--an-surface-*, --an-text-*, --an-interactive-*). App CSS may use --an-* values but never defines them.",
    dontText:
      "Hardcode hex, rgba, px radii, or shadow literals. Five different reds serving as danger is how the last system died.",
  },
  {
    topic: "Depth",
    doText:
      "Express hierarchy with the elevation scale plus surface tint steps (sunken / base / raised / overlay). Hover lifts one step.",
    dontText:
      "Fake depth with 1px borders on white, or invent one-off box-shadows per surface.",
  },
  {
    topic: "Motion",
    doText:
      "Use duration and easing tokens; keep exits faster than enters (drawer: enter 200ms, exit 160ms). Respect prefers-reduced-motion.",
    dontText:
      "Ship ad hoc 400ms ease transitions, or motion that keeps looping for decoration.",
  },
  {
    topic: "Accent",
    doText:
      "Cobalt is the interactive voice. Ember is a restrained highlight: progress, warm emphasis, sparingly.",
    dontText:
      "Use ember for primary actions or spread it across the chrome; two competing accents read as noise.",
  },
  {
    topic: "Boundary",
    doText:
      "Wrap app chrome (editor shell, dialogs, rails) in class=\"anvil\". Player chrome takes structure from Anvil, brand accents from the course theme.",
    dontText:
      "Apply Anvil tokens or components to learner course content. --forge-*/--fb-* stay author-themed, always.",
  },
  {
    topic: "Focus",
    doText:
      "Keep the two-layer focus ring (--an-focus-ring) on every interactive control; it is part of the depth language.",
    dontText:
      "Remove outlines without a replacement, or rely on color change alone to show focus.",
  },
];

export function DoDontSection(): ReactElement {
  return (
    <Section id="do-dont" title="Do / Don't">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
          gap: "var(--an-space-16)",
          marginTop: "var(--an-space-16)",
        }}
      >
        {PAIRS.map((pair) => (
          <div
            key={pair.topic}
            style={{
              background: "var(--an-surface-raised)",
              borderRadius: "var(--an-radius-lg)",
              boxShadow: "var(--an-elevation-1)",
              padding: "var(--an-space-16)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "var(--an-space-8)" }}>
              {pair.topic}
            </div>
            <div
              style={{
                borderLeft: "3px solid var(--an-status-success-solid)",
                paddingLeft: "var(--an-space-8)",
                marginBottom: "var(--an-space-8)",
                fontSize: "var(--an-font-size-14)",
                lineHeight: "var(--an-font-line-14)",
              }}
            >
              <strong style={{ color: "var(--an-status-success-fg)" }}>Do.</strong>{" "}
              {pair.doText}
            </div>
            <div
              style={{
                borderLeft: "3px solid var(--an-status-danger-solid)",
                paddingLeft: "var(--an-space-8)",
                fontSize: "var(--an-font-size-14)",
                lineHeight: "var(--an-font-line-14)",
              }}
            >
              <strong style={{ color: "var(--an-status-danger-fg)" }}>Don't.</strong>{" "}
              {pair.dontText}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

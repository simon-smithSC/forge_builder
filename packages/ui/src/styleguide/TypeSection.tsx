// Foundations: typography. The role scale rendered live at real size, with
// the exact px / line-height / weight / tracking spec beside each specimen.
import type { ReactElement } from "react";
import { anvilTokens } from "../tokens.js";
import { Heading, Text } from "../components/Typography.js";
import { Mono, Section, Sub } from "./shared.js";

const SAMPLE = "Course chrome is shaped on Anvil";
const PARAGRAPH_SAMPLE =
  "Blocks carry the lesson; chrome carries the tools. Anvil sets the tools in Geist Sans on a role scale, so nothing in the editor is ever squinted at.";

function px(rem: string): string {
  return `${String(parseFloat(rem) * 16)}px`;
}

const ROLE_USE: Record<string, string> = {
  displayLarge: "Marketing moments, empty workspace hero",
  display: "Screen titles on full-page views",
  headingLarge: "Page and dialog group headings",
  heading: "Panel and card headings",
  headingSmall: "Sub-groups inside panels",
  labelLarge: "Prominent control labels, list titles",
  label: "Buttons, inputs, menu items (14px UI floor)",
  labelSmall: "Dense meta labels (13px label floor)",
  paragraphLarge: "Lead copy, onboarding",
  paragraph: "Default reading text (16px)",
  paragraphSmall: "Support copy inside chrome (14px UI floor)",
  mono: "IDs, code, xAPI detail",
};

export function TypeSection(): ReactElement {
  const roles = Object.entries(anvilTokens.type);

  return (
    <Section
      id="typography"
      title="Typography"
      lede="Geist Sans (variable, OFL) is the single UI face; JetBrains Mono carries code. Twelve roles pair explicit size, line-height, weight, and tracking (Base-style: display / heading / label / paragraph). Floors: 16px default reading, 14px UI paragraphs and labels, 13px small labels, 12px absolute. Nothing renders below 12px."
    >
      <Sub
        title="Role scale"
        note="Live specimens at real size. Consume via the Heading / Text / Label components, the an-type-* classes, or the --an-type-* custom properties; never a bare font-size."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--an-space-16)" }}>
          {roles.map(([role, spec]) => (
            <div
              key={role}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--an-space-24)",
                borderBottom: "1px solid var(--an-border-subtle)",
                paddingBottom: "var(--an-space-12)",
              }}
            >
              <div style={{ width: "13rem", flex: "none" }}>
                <div className="an-type-label">{role}</div>
                <Mono>
                  {px(spec.fontSize)} / {px(spec.lineHeight)} · {spec.fontWeight} ·{" "}
                  {spec.letterSpacing}
                </Mono>
                <div className="an-type-label-small" style={{ color: "var(--an-text-muted)", fontWeight: 400 }}>
                  {ROLE_USE[role]}
                </div>
              </div>
              <div
                style={{
                  font: `var(--an-type-${role.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()})`,
                  letterSpacing: spec.letterSpacing,
                  minWidth: 0,
                }}
              >
                {role === "mono" ? "course_9f2c :: xapi/completed :: rev 41" : SAMPLE}
              </div>
            </div>
          ))}
        </div>
      </Sub>

      <Sub
        title="Components"
        note="Heading (displayLarge..headingSmall, element via as=), Text (paragraph/label/mono roles, tone slot), Label (form captions, htmlFor)."
      >
        <div style={{ maxWidth: "44rem" }}>
          <Heading role="headingLarge" as="h4">
            Publish checklist
          </Heading>
          <Text tone="secondary" style={{ marginTop: "var(--an-space-8)" }}>
            {PARAGRAPH_SAMPLE}
          </Text>
          <Text role="paragraphSmall" tone="muted" style={{ marginTop: "var(--an-space-8)" }}>
            Support copy uses paragraphSmall, the 14px UI floor.
          </Text>
          <Text role="mono" as="span">
            anvil.tokens.json → build.ts → --an-type-*
          </Text>
        </div>
      </Sub>

      <Sub
        title="Webfont loading"
        note="fonts.css declares Geist Sans + JetBrains Mono (font-display: swap) plus metric-adjusted local fallbacks (size-adjust), so text renders instantly and does not reflow when the woff2 arrives. Binaries are fetched once with: node packages/ui/scripts/fetch-fonts.mjs"
      >
        <Mono>
          font-family: {anvilTokens.font.family.sans}
        </Mono>
      </Sub>
    </Section>
  );
}

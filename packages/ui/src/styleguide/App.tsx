// Anvil living styleguide. Built into a self-contained HTML page by
// scripts/make-styleguide.mjs (repo root); review artifact for each D phase.
// Structure: Foundations (typography, icons, tokens) -> Components ->
// Patterns -> Principles.
import type { ReactElement } from "react";
import { useState } from "react";
import { Badge } from "../components/Badge.js";
import { Switch } from "../components/Switch.js";
import { ComponentsSection } from "./ComponentsSection.js";
import { DoDontSection } from "./DoDontSection.js";
import { IconsSection } from "./IconsSection.js";
import { MotionSection } from "./MotionSection.js";
import { OverlaysSection } from "./OverlaysSection.js";
import { PatternsSection } from "./PatternsSection.js";
import { TokensSection } from "./TokensSection.js";
import { TypeSection } from "./TypeSection.js";

const NAV: Array<[string, string]> = [
  ["#typography", "Typography"],
  ["#icons", "Icons"],
  ["#tokens", "Tokens"],
  ["#components", "Controls"],
  ["#overlays", "Surfaces"],
  ["#motion", "Motion"],
  ["#patterns", "Patterns"],
  ["#do-dont", "Principles"],
];

export default function App(): ReactElement {
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);

  return (
    <div
      className="anvil"
      data-theme={dark ? "dark" : undefined}
      data-density={compact ? "compact" : undefined}
      style={{ minHeight: "100vh" }}
    >
      <div
        style={{
          maxWidth: "68rem",
          margin: "0 auto",
          padding: "var(--an-space-40) var(--an-space-24) var(--an-space-64)",
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: "var(--an-space-24)",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1 className="an-type-display" style={{ margin: 0 }}>
              Anvil
              <span
                style={{
                  display: "inline-block",
                  width: "0.4em",
                  height: "0.4em",
                  marginLeft: "0.3em",
                  borderRadius: "var(--an-radius-xs)",
                  background: "var(--an-accent)",
                }}
                aria-hidden
              />
            </h1>
            <p
              className="an-type-paragraph"
              style={{
                margin: "var(--an-space-8) 0 0",
                maxWidth: "40rem",
                color: "var(--an-text-secondary)",
              }}
            >
              The surface Forge tools are shaped on. Geist Sans on a twelve-role
              type scale, a vendored Lucide icon set, deep cobalt with a
              restrained ember accent, crisp layered depth, decisive 120-200ms
              motion. Anvil skins app chrome only; learner course content stays
              author-themed.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--an-space-8)", marginTop: "var(--an-space-12)" }}>
              <Badge tone="primary">--an-* tokens</Badge>
              <Badge>Geist Sans / JetBrains Mono</Badge>
              <Badge mono>@forge/ui 0.2.0</Badge>
            </div>
            <nav
              aria-label="Sections"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--an-space-4) var(--an-space-16)",
                marginTop: "var(--an-space-16)",
              }}
            >
              {NAV.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="an-type-label"
                  style={{ color: "var(--an-interactive-idle)", textDecoration: "none" }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--an-space-8)",
              background: "var(--an-surface-raised)",
              borderRadius: "var(--an-radius-lg)",
              boxShadow: "var(--an-elevation-2)",
              padding: "var(--an-space-12) var(--an-space-16)",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "var(--an-space-8)", fontSize: "var(--an-font-size-14)" }}>
              <Switch checked={dark} onCheckedChange={setDark} aria-label="Dark mode" />
              Dark mode <code style={{ fontFamily: "var(--an-font-family-mono)", fontSize: "var(--an-font-size-12)", color: "var(--an-text-muted)" }}>data-theme</code>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--an-space-8)", fontSize: "var(--an-font-size-14)" }}>
              <Switch checked={compact} onCheckedChange={setCompact} aria-label="Compact density" />
              Compact <code style={{ fontFamily: "var(--an-font-family-mono)", fontSize: "var(--an-font-size-12)", color: "var(--an-text-muted)" }}>data-density</code>
            </label>
          </div>
        </header>

        <TypeSection />
        <IconsSection />
        <TokensSection />
        <ComponentsSection />
        <OverlaysSection />
        <MotionSection />
        <PatternsSection />
        <DoDontSection />

        <footer
          className="an-type-paragraph-small"
          style={{
            marginTop: "var(--an-space-64)",
            paddingTop: "var(--an-space-16)",
            borderTop: "1px solid var(--an-border-subtle)",
            color: "var(--an-text-muted)",
          }}
        >
          Generated by scripts/make-styleguide.mjs from @forge/ui 0.2.0. Tokens:
          src/tokens/anvil.tokens.json. Icons: scripts/generate-icons.mjs
          (Lucide, ISC). Fonts: scripts/fetch-fonts.mjs. Docs:
          docs/design-system/.
        </footer>
      </div>
    </div>
  );
}

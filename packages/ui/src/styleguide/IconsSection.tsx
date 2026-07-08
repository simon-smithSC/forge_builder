// Foundations: icons. Searchable gallery of the vendored Lucide set.
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Icon } from "../components/Icon.js";
import { iconNames } from "../icons/icons.js";
import { Input } from "../components/Input.js";
import { Mono, Row, Section, Sub } from "./shared.js";

export function IconsSection(): ReactElement {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const visible = useMemo(
    () => iconNames.filter((name) => name.includes(term)),
    [term],
  );

  return (
    <Section
      id="icons"
      title="Icons"
      lede="Stroke icons on the 24px Lucide grid (geometry vendored under the ISC license; zero runtime dependency). Sizes are tokens: 16 inline with text, 20 in controls, 24 for emphasis and empty states. Stroke width stays 2 at every size; color rides currentColor."
    >
      <Sub title="Sizing" note="--an-icon-size-16/20/24, --an-icon-stroke-regular.">
        <Row style={{ alignItems: "flex-end" }}>
          {[16, 20, 24].map((size) => (
            <div key={size} style={{ textAlign: "center" }}>
              <Icon name="settings" size={size} />
              <div>
                <Mono>{size}px</Mono>
              </div>
            </div>
          ))}
          <div style={{ textAlign: "center", color: "var(--an-interactive-idle)" }}>
            <Icon name="circle-check" size={24} />
            <div>
              <Mono>currentColor</Mono>
            </div>
          </div>
        </Row>
      </Sub>

      <Sub
        title={`Gallery (${String(visible.length)} of ${String(iconNames.length)})`}
        note='Usage: <Icon name="chevron-down" size={16} />. Decorative by default (aria-hidden); pass label for standalone semantics.'
      >
        <div style={{ maxWidth: "20rem", marginBottom: "var(--an-space-16)" }}>
          <Input
            placeholder="Search icons"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search icons"
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))",
            gap: "var(--an-space-8)",
          }}
        >
          {visible.map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--an-space-6)",
                padding: "var(--an-space-12) var(--an-space-8)",
                background: "var(--an-surface-raised)",
                borderRadius: "var(--an-radius-md)",
                boxShadow: "var(--an-elevation-0)",
              }}
            >
              <Icon name={name} size={20} />
              <Mono>{name}</Mono>
            </div>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="an-type-paragraph-small" style={{ color: "var(--an-text-muted)" }}>
            No icon matches "{query}". Add it to NAMES in scripts/generate-icons.mjs and rerun the generator.
          </p>
        ) : null}
      </Sub>
    </Section>
  );
}

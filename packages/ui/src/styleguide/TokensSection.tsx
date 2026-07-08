// Token reference: every primitive rendered. Data comes straight from the
// generated tokens.ts so the page can never drift from the source of truth.
import type { CSSProperties, ReactElement } from "react";
import { useState } from "react";
import { anvilTokens } from "../tokens.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import type { CardElevation } from "../components/Card.js";
import { Input } from "../components/Input.js";
import { Mono, Row, Section, Sub } from "./shared.js";

function GradientSwatch({
  name,
  gradient,
}: {
  name: string;
  gradient: string;
}): ReactElement {
  return (
    <div style={{ width: "9rem" }}>
      <div
        style={{
          height: "2.5rem",
          borderRadius: "var(--an-radius-md)",
          background: gradient,
          boxShadow: "var(--an-elevation-1)",
        }}
      />
      <div style={{ marginTop: "var(--an-space-2)" }}>
        <Mono>{name}</Mono>
      </div>
    </div>
  );
}

function Swatch({ name, value }: { name: string; value: string }): ReactElement {
  return (
    <div style={{ width: "5.5rem" }}>
      <div
        style={{
          height: "2.5rem",
          borderRadius: "var(--an-radius-sm)",
          background: value,
          boxShadow: "var(--an-elevation-0)",
        }}
      />
      <div style={{ marginTop: "var(--an-space-2)" }}>
        <Mono>
          {name}
          <br />
          {value}
        </Mono>
      </div>
    </div>
  );
}

function MotionDemo({
  label,
  duration,
  easing,
}: {
  label: string;
  duration: string;
  easing: string;
}): ReactElement {
  const [at, setAt] = useState(false);
  const dot: CSSProperties = {
    width: "1rem",
    height: "1rem",
    borderRadius: "var(--an-radius-full)",
    background: "var(--an-interactive-idle)",
    transform: at ? "translateX(8rem)" : "translateX(0)",
    transition: `transform ${duration} ${easing}`,
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--an-space-12)",
        width: "100%",
        maxWidth: "26rem",
      }}
    >
      <Button size="sm" onClick={() => setAt((v) => !v)}>
        Play
      </Button>
      <div style={{ flex: 1 }}>
        <div style={{ ...dot }} />
      </div>
      <Mono>{label}</Mono>
    </div>
  );
}

export function TokensSection(): ReactElement {
  const ramps = Object.entries(anvilTokens.color) as Array<
    [string, Record<string, string>]
  >;
  const spaces = Object.entries(anvilTokens.space) as Array<[string, string]>;
  const sizes = Object.entries(anvilTokens.font.size) as Array<[string, string]>;
  const lines = anvilTokens.font.line as Record<string, string>;
  const radii = Object.entries(anvilTokens.radius) as Array<[string, string]>;
  const durations = Object.entries(anvilTokens.duration) as Array<
    [string, string]
  >;
  const eases = Object.entries(anvilTokens.ease) as Array<[string, string]>;

  return (
    <Section
      id="tokens"
      title="Color, space, depth, motion"
      lede="Tier 1 primitives and the semantic tier components actually consume. Dark mode and compact density remap semantics only."
    >
      <Sub
        title="Color ramps"
        note="Tier 1 primitives (--an-color-*). Components never touch these directly; they consume the semantic tier (surface, text, interactive, border, status), which is what dark mode remaps."
      >
        {ramps.map(([ramp, steps]) => (
          <div key={ramp} style={{ marginBottom: "var(--an-space-16)" }}>
            <div style={{ marginBottom: "var(--an-space-4)", fontWeight: 500 }}>
              {ramp}
            </div>
            <Row style={{ gap: "var(--an-space-6)" }}>
              {Object.entries(steps).map(([step, value]) => (
                <Swatch key={step} name={`${ramp}-${step}`} value={value} />
              ))}
            </Row>
          </div>
        ))}
      </Sub>

      <Sub title="Spacing" note="4px-base scale (--an-space-*), emitted as rem.">
        {spaces.map(([name, value]) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--an-space-12)",
              marginBottom: "var(--an-space-4)",
            }}
          >
            <span style={{ width: "6rem" }}>
              <Mono>
                space-{name} ({value})
              </Mono>
            </span>
            <span
              style={{
                display: "inline-block",
                width: value,
                height: "0.75rem",
                background: "var(--an-interactive-idle)",
                borderRadius: "var(--an-radius-xs)",
              }}
            />
          </div>
        ))}
      </Sub>

      <Sub
        title="Size ladder"
        note="Raw --an-font-size-* / --an-font-line-* pairs behind the role scale (see Typography for the roles). 12px is the absolute floor."
      >
        {sizes.map(([px, rem]) => (
          <div
            key={px}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--an-space-16)",
              marginBottom: "var(--an-space-8)",
            }}
          >
            <span style={{ width: "8rem" }}>
              <Mono>
                {px}px / {rem} lh {lines[px]}
              </Mono>
            </span>
            <span style={{ fontSize: rem, lineHeight: lines[px] }}>
              Forge tools are shaped on Anvil
            </span>
          </div>
        ))}
        <div style={{ marginTop: "var(--an-space-12)" }}>
          <span
            style={{
              fontFamily: "var(--an-font-family-mono)",
              fontSize: "var(--an-font-size-13)",
              background: "var(--an-surface-sunken)",
              padding: "var(--an-space-4) var(--an-space-8)",
              borderRadius: "var(--an-radius-sm)",
            }}
          >
            course_9f2c :: xapi/completed :: rev 41
          </span>
        </div>
      </Sub>

      <Sub title="Radius" note="--an-radius-xs..full (2 / 4 / 6 / 10 / 16 / 999).">
        <Row>
          {radii.map(([name, value]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "4rem",
                  height: "3rem",
                  borderRadius: value,
                  background: "var(--an-surface-raised)",
                  boxShadow: "var(--an-elevation-1)",
                }}
              />
              <Mono>
                {name} {value}
              </Mono>
            </div>
          ))}
        </Row>
      </Sub>

      <Sub
        title="Elevation"
        note="Five layered levels: border-tint + key + ambient shadow, neutral-tinted. 0 canvas, 1 cards, 2 raised controls, 3 popovers, 4 dialogs and toasts. Hover a level to see the one-step lift."
      >
        <Row style={{ gap: "var(--an-space-24)", alignItems: "stretch" }}>
          {([0, 1, 2, 3, 4] as CardElevation[]).map((level) => (
            <Card
              key={level}
              elevation={level}
              interactive
              style={{ width: "8rem", textAlign: "center" }}
            >
              <div style={{ fontWeight: 600 }}>Level {level}</div>
              <Mono>--an-elevation-{level}</Mono>
            </Card>
          ))}
        </Row>
      </Sub>

      <Sub
        title="Depth and focus finishes"
        note="Signature moves (5A/5C): solid fills carry the machined bevel pair (--an-bevel-highlight over --an-bevel-edge), fields glow on focus (--an-focus-glow, danger-tinted when invalid), and the two sanctioned gradients mark brand moments only (Wordmark, course-card strip)."
      >
        <Row style={{ gap: "var(--an-space-24)", alignItems: "center" }}>
          <Button variant="primary">Bevelled fill</Button>
          <div style={{ width: "12rem" }}>
            <Input placeholder="Focus for the glow" aria-label="Focus glow demo" />
          </div>
          <GradientSwatch
            name="brand-gradient"
            gradient="var(--an-brand-gradient)"
          />
          <GradientSwatch
            name="accent-gradient"
            gradient="var(--an-accent-gradient)"
          />
        </Row>
      </Sub>

      <Sub
        title="Motion"
        note="Durations 80-280ms, decisive. Exits run faster than enters. All durations collapse to 0ms under prefers-reduced-motion."
      >
        {durations.map(([name, value]) => (
          <MotionDemo
            key={name}
            label={`duration-${name} standard`}
            duration={value}
            easing={anvilTokens.ease.standard}
          />
        ))}
        <div style={{ height: "var(--an-space-12)" }} />
        {eases.map(([name, value]) => (
          <MotionDemo
            key={name}
            label={`ease-${name}`}
            duration={anvilTokens.duration["200"]}
            easing={value}
          />
        ))}
      </Sub>

      <Sub title="Z-index bands" note="--an-z-*: base, raised, sticky, overlay, modal, toast.">
        <Row>
          {Object.entries(anvilTokens.z).map(([name, value]) => (
            <Mono key={name}>
              z-{name}={String(value)}
            </Mono>
          ))}
        </Row>
      </Sub>
    </Section>
  );
}

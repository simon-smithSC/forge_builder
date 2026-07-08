// Layout helpers for the living styleguide page. Not part of the public API.
import type { CSSProperties, ReactElement, ReactNode } from "react";

export function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section id={id} style={{ marginTop: "var(--an-space-64)" }}>
      <h2
        className="an-type-heading-large"
        style={{
          borderBottom: "1px solid var(--an-border-subtle)",
          paddingBottom: "var(--an-space-8)",
          margin: "0 0 var(--an-space-8)",
        }}
      >
        {title}
      </h2>
      {lede !== undefined ? (
        <p
          className="an-type-paragraph"
          style={{ margin: "0 0 var(--an-space-16)", maxWidth: "44rem", color: "var(--an-text-secondary)" }}
        >
          {lede}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function Sub({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div style={{ marginTop: "var(--an-space-32)" }}>
      <h3 className="an-type-heading-small" style={{ margin: "0 0 var(--an-space-4)" }}>
        {title}
      </h3>
      {note !== undefined ? (
        <p
          className="an-type-paragraph-small"
          style={{ color: "var(--an-text-muted)", margin: "0 0 var(--an-space-12)", maxWidth: "44rem" }}
        >
          {note}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Component specimen: anatomy note up top, demos, one do/dont at the foot. */
export function Spec({
  title,
  anatomy,
  doText,
  dontText,
  children,
}: {
  title: string;
  /** One sentence: the parts and how they compose. */
  anatomy: string;
  doText: string;
  dontText: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div style={{ marginTop: "var(--an-space-40)" }}>
      <h3 className="an-type-heading-small" style={{ margin: "0 0 var(--an-space-4)" }}>
        {title}
      </h3>
      <p
        className="an-type-paragraph-small"
        style={{ color: "var(--an-text-muted)", margin: "0 0 var(--an-space-12)", maxWidth: "44rem" }}
      >
        <strong style={{ color: "var(--an-text-secondary)" }}>Anatomy.</strong>{" "}
        {anatomy}
      </p>
      {children}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          gap: "var(--an-space-12)",
          marginTop: "var(--an-space-12)",
          maxWidth: "44rem",
        }}
      >
        <div
          className="an-type-paragraph-small"
          style={{ borderLeft: "3px solid var(--an-status-success-solid)", paddingLeft: "var(--an-space-8)" }}
        >
          <strong style={{ color: "var(--an-status-success-fg)" }}>Do.</strong> {doText}
        </div>
        <div
          className="an-type-paragraph-small"
          style={{ borderLeft: "3px solid var(--an-status-danger-solid)", paddingLeft: "var(--an-space-8)" }}
        >
          <strong style={{ color: "var(--an-status-danger-fg)" }}>Don't.</strong> {dontText}
        </div>
      </div>
    </div>
  );
}

/** Labeled row inside a specimen: "Variants", "Sizes", "States". */
export function DemoRow({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--an-space-16)",
        marginTop: "var(--an-space-8)",
      }}
    >
      <span
        className="an-type-label-small"
        style={{
          width: "4.5rem",
          flex: "none",
          color: "var(--an-text-muted)",
          paddingTop: "var(--an-space-8)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--an-space-12)",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Statically shows the focus treatment a keyboard user gets. */
export function FocusGhost({ children }: { children: ReactNode }): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: "var(--an-radius-md)",
        boxShadow: "var(--an-focus-ring)",
      }}
      title="Simulated :focus-visible"
    >
      {children}
    </span>
  );
}

export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--an-space-12)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }): ReactElement {
  return (
    <span
      style={{
        fontFamily: "var(--an-font-family-mono)",
        fontSize: "var(--an-font-size-12)",
        lineHeight: "var(--an-font-line-12)",
        color: "var(--an-text-muted)",
      }}
    >
      {children}
    </span>
  );
}

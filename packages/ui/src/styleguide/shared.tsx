// Layout helpers for the living styleguide page. Not part of the public API.
import type { CSSProperties, ReactElement, ReactNode } from "react";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section id={id} style={{ marginTop: "var(--an-space-64)" }}>
      <h2
        style={{
          fontSize: "var(--an-font-size-22)",
          lineHeight: "var(--an-font-line-22)",
          fontWeight: 600,
          borderBottom: "1px solid var(--an-border-subtle)",
          paddingBottom: "var(--an-space-8)",
          margin: "0 0 var(--an-space-16)",
        }}
      >
        {title}
      </h2>
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
    <div style={{ marginTop: "var(--an-space-24)" }}>
      <h3
        style={{
          fontSize: "var(--an-font-size-14)",
          lineHeight: "var(--an-font-line-14)",
          fontWeight: 600,
          margin: "0 0 var(--an-space-4)",
        }}
      >
        {title}
      </h3>
      {note !== undefined ? (
        <p
          style={{
            fontSize: "var(--an-font-size-12)",
            lineHeight: "var(--an-font-line-12)",
            color: "var(--an-text-muted)",
            margin: "0 0 var(--an-space-12)",
          }}
        >
          {note}
        </p>
      ) : null}
      {children}
    </div>
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
        fontSize: "var(--an-font-size-11)",
        color: "var(--an-text-muted)",
      }}
    >
      {children}
    </span>
  );
}

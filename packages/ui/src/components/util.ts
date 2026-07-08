// Internal helpers shared by Anvil components. Not part of the public API.

/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type ControlSize = "sm" | "md" | "lg";
export type Tone = "neutral" | "primary" | "success" | "warn" | "danger" | "info";

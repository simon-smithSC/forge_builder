// Shared contract for the purpose-built per-family payload editors. The
// dispatcher in PayloadEditor.tsx validates every candidate payload with the
// block registry's validatePayload before committing; editors only propose
// full replacement payload objects.
import type { Block } from "@forge/schema";

export interface FamilyEditorProps {
  block: Block;
  /** Propose a full replacement payload; the dispatcher validates + commits. */
  onChange: (payload: unknown) => void;
  /** Zod message from the last rejected proposal, if any. */
  error?: string | undefined;
}

/**
 * Copy `base` with `key` set, or with the key removed entirely when the value
 * is undefined or an empty string. Keeps optional keys omitted (never
 * undefined) so strict payload schemas and exactOptionalPropertyTypes agree.
 */
export function setOptional<T extends object>(
  base: T,
  key: keyof T & string,
  value: unknown,
): T {
  const next = { ...base } as Record<string, unknown>;
  if (value === undefined || value === "") {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next as T;
}

/**
 * Deterministic JSON serialization: object keys sorted recursively,
 * undefined-valued properties dropped (matching JSON.stringify), arrays
 * kept in order. Same input value always yields byte-identical output.
 */
export function stableStringify(value: unknown): string {
  const serialized = JSON.stringify(sortKeysDeep(value));
  if (serialized === undefined) {
    throw new Error("Cannot serialize undefined to JSON.");
  }
  return serialized;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const entry = source[key];
      if (entry !== undefined) {
        out[key] = sortKeysDeep(entry);
      }
    }
    return out;
  }
  return value;
}

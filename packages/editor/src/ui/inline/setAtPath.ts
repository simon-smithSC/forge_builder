// Small immutable set-value-at-path helper for the inline editing commit
// path (P1). Paths are dot-separated payload locations produced by
// @forge/blocks EditableHtml, e.g. "html", "heading", "columns.0.html",
// "items.2.html", "buttons.1.description". Numeric segments index arrays.
// Every container along the path is shallow-cloned; untouched siblings keep
// their identity. Missing containers throw: the caller treats that as a
// failed commit (the payload shape changed under the field).

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function setAtPath(base: unknown, path: string, value: unknown): unknown {
  const segments = path.split(".");
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error(`Invalid payload path "${path}".`);
  }
  return setSegments(base, segments, value, path);
}

function setSegments(
  node: unknown,
  segments: readonly string[],
  value: unknown,
  fullPath: string,
): unknown {
  const head = segments[0];
  if (head === undefined) return value;
  const rest = segments.slice(1);

  if (Array.isArray(node)) {
    const index = Number(head);
    if (!Number.isInteger(index) || index < 0 || index >= node.length) {
      throw new Error(`Payload path "${fullPath}" points at a missing index.`);
    }
    const next = [...node];
    next[index] = setSegments(node[index], rest, value, fullPath);
    return next;
  }

  if (isRecord(node)) {
    if (rest.length > 0 && !(head in node)) {
      throw new Error(`Payload path "${fullPath}" points at a missing key.`);
    }
    return { ...node, [head]: setSegments(node[head], rest, value, fullPath) };
  }

  throw new Error(`Payload path "${fullPath}" does not match the payload shape.`);
}

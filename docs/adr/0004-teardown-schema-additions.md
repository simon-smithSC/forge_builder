# ADR 0004: Teardown-driven schema additions (schemaVersion 1.1.0)

Date: 2026-07-07
Status: Accepted (decision: Simon Smith, 2026-07-07)

## Context

The live Rise teardown (docs/reference/rise-teardown.md) and the parity plan (docs/RISE-PARITY-PLAN.md) surfaced three authoring capabilities the frozen 1.0.0 content contract cannot express:

1. Text blocks can carry optional narration audio (`Audio` section with `Add audio` in the text block drawer, teardown lines ~194 and ~397-403).
2. Button/location items have rich title and description text above the button itself (teardown ~985-1005).
3. Courses expose an author byline (teardown ~60, ~239).

The schema is the frozen content contract: changes must be additive with a registered migration.

## Decision

Bump `CURRENT_SCHEMA_VERSION` from 1.0.0 to 1.1.0 with three additive, optional fields:

1. Every text family payload variant (paragraph, heading, subheading, heading+paragraph, subheading+paragraph, two column) gains optional `audioMediaId` (a `MediaRef` id, kind `audio`). Blocks render narration audio when present.
2. `buttons` payload items gain optional `title` and `description`, both sanitized HTML fragments under the shared sanitizer policy.
3. `courseDocSchema` gains optional `author` (non-empty string).

Migration `1.0.0 -> 1.1.0` is registered in `courseDocMigrationRegistry`; since every new field is optional its `up()` is a pure `schemaVersion` bump. The existing `0.9.0` migration now targets `1.0.0` explicitly so the chain composes.

## Consequences

- Every valid 1.0.0 document is valid 1.1.0 content after the version bump; no content rewriting occurs.
- Renderer support (@forge/blocks, @forge/player) and editor affordances (@forge/editor) land separately in parallel workstreams; the schema only widens the contract.
- The kitchen-sink fixture and generated JSON Schema (dist/json) are regenerated to cover the new fields.

# ADR 0003: Schema canonicalization, legacy model deletion, rise-compat cut

Date: 2026-07-07
Status: Accepted

## Context

The Phase 2 editor defined a parallel untyped content model (`packages/editor/src/domain/courseModel.ts`, `content: Record<string, unknown>`) and persisted courses to localStorage, bypassing both `@forge/schema` and `services/api`. This violated the CONTRACTS.md content-model boundary and caused the defects catalogued in docs/block-functionality-audit.md.

## Decision

1. **`CourseDoc` from `@forge/schema` is the only content model.** `packages/editor/src/domain/courseModel.ts` is deleted. Enforced by `scripts/contract-check.mjs` (fails if the file exists or if editor source declares content-model types).
2. **No migration of legacy localStorage courses** (decision: Simon Smith, 2026-07-07). They are test data. localStorage-based course persistence is removed; localStorage/IndexedDB remain only for the write-ahead journal role (SPEC 4.5.2).
3. **The `rise-compat` statement profile is cut from v1** (decision: Simon Smith, 2026-07-07): no Learning Locker dashboard was named that must keep working against Rise-shaped statements. The schema keeps the enum value as reserved so existing documents stay valid, but the publish UI does not offer it and `packages/xapi` does not implement it. Revisit only if a concrete dashboard dependency is named.
4. **Deferred-not-blocking config defaults** (decision: Simon Smith, 2026-07-07):
   - IRI base `https://xapi.supercell.com/` is a configurable parameter of the schema IRI builders; confirm before first production publish.
   - Missing `registration` at launch: the player generates one and persists it in State under a fixed key (SPEC 13.2 fallback).

## Consequences

The editor rebuild (RECOVERY-PLAN R1) starts from a deleted model rather than a migration, removing a whole class of dual-model bugs. Publishing gains a single statement profile, shrinking the xAPI conformance matrix by half.

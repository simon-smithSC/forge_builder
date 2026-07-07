# ADR 0002: Stack convergence after the Phase 2 divergence

Date: 2026-07-07
Status: Accepted

## Context

SPEC section 2 fixes the technology stack and requires an ADR for deviations. The Phase 2 build deviated without ADRs: raw contentEditable instead of TipTap, no dnd-kit, no Zustand/TanStack Query, no Tailwind, and React 19 instead of the specced React 18. The recovery (docs/RECOVERY-PLAN.md) re-converges the stack. This ADR records what is accepted, what is rejected, and what is deferred with an explicit bridge.

An environmental constraint shapes the R1 implementation: the current build sandbox has no npm registry access, so no new dependencies can be installed until the work runs on a networked machine. React, react-dom, zod, lucide-react, and the TypeScript toolchain are already present in the workspace store and are the only third-party runtime dependencies available to R1.

## Decision

1. **React 19 is accepted** (supersedes "React 18" in SPEC section 2). Already in the lockfile; no React-18-only APIs are in use.
2. **TipTap 2, dnd-kit, Zustand + Immer, TanStack Query, Tailwind remain the committed stack** per SPEC. Their adoption is scheduled for R2, gated on dependency installation being possible.
3. **R1 bridges, all marked with `// R2:` comments at every site:**
   - State: a small hand-rolled store (subscribe/getState/setState with immutable updates) with the same shape a Zustand store will take. Replacement is mechanical.
   - Server state: a thin typed fetch client instead of TanStack Query.
   - Text editing: minimal inline editing in editor wrappers. This is a bridge, not an endorsement; TipTap replaces it in R2 and raw contentEditable remains banned as a permanent solution.
   - Styling: plain CSS with custom properties in packages/blocks/src/styles.css, using theme tokens. Tailwind adoption in R2 maps these tokens.
4. **Recharts stays out of the player** per SPEC; the chart renderer is a small SVG implementation shared via packages/blocks.

## Consequences

R1 ships without new dependencies. R2 begins with a dependency-installation step on a networked machine (`pnpm add` per package), then replaces the bridges. The `// R2:` marker makes the bridge surface greppable and reviewable.

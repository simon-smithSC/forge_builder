# ADR 0005: Handoff to Codex; documentation restructure

Date: 2026-07-09
Status: Accepted (decision: Simon Smith, 2026-07-09)

## Context

The recovery-and-polish program (R0–R3, parity P1–P7, player UX U1–U5, Anvil D1–D6 +
beautification, motion, schema v1.3.0 block features) was executed by Claude and is
complete at commit `8e1a00c`. Development now hands off to Codex (OpenAI's coding agent).
The docs tree had accumulated eight executed plan documents plus two pre-recovery audit
artifacts whose architecture descriptions were superseded by ADR 0002/0003; keeping them
risked a new agent treating stale plans as current instructions — the exact failure mode
the recovery fixed.

## Decision

1. **Executed plan docs are deleted, not archived.** Removed: `docs/RECOVERY-PLAN.md`,
   `docs/RISE-PARITY-PLAN.md`, `docs/PLAYER-UX-PLAN.md`, `docs/POLISH-PLAN.md`,
   `docs/MOTION-PLAN.md`, `docs/BLOCKS-POLISH-PLAN.md`, `docs/block-functionality-audit.md`,
   `docs/visual-parity-checklist.md`, `docs/superpowers/`, and root `teardown.md`
   (byte-identical duplicate of `docs/reference/rise-teardown.md`). They remain in git
   history; code comments citing them refer to history.
2. **Durable constraints from those plans were harvested into `docs/CODEX-RULES.md`**, a
   numbered, code-verified ruleset (architecture invariants, design-system rules,
   build/verification gates, sanitization rules, process rules). It is binding; deviations
   require an ADR.
3. **New standing docs**: `docs/ROADMAP.md` (done/next), `docs/RUNBOOK.md` (verified
   operational commands), `docs/PROMPTS.md` (session templates), and root `AGENTS.md`
   (auto-loaded standing orders for Codex).
4. **Kept as-is**: `docs/SPEC.md` (the contract; §3.1 refreshed to show the v1.1.0–v1.2.0
   optional course fields), `docs/adr/`, `docs/design-system/` (decisions.md stays the
   living log), `docs/reference/` (authoritative Rise + xAPI artifacts),
   `docs/DESIGN-SYSTEM-PLAN.md` (referenced by the design-system README as the program
   plan). `coordination/` was slimmed to a handoff STATUS, refreshed CONTRACTS, and a
   pointer REQUESTS.

## Consequences

Future work is governed by SPEC + CODEX-RULES + ADRs + decisions.md; plans are transient
artifacts that get deleted when executed (CODEX-RULES F5). The docs surface is small
enough to be read in full at session start (docs/PROMPTS.md opening prompt).

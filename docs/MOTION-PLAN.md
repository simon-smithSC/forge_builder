# MOTION-PLAN — Enter/exit transitions for editor chrome

Prompted by: "Could we use Mantine to deal with the transitions for our UI
elements like the rails, the add tab stuff etc?" (2026-07-08). Verdict up
front: we could, but we shouldn't — recommendation is ~150 lines of
Anvil-native motion primitives instead. Rationale and full plan below.

## 1. Inventory — what actually snaps

Three problem classes: (a) state-change transitions on always-mounted nodes
(CSS handles; mostly DONE after V5B/V5C), (b) missing ENTER animations on
newly mounted nodes (pure CSS can fix), (c) missing EXIT animations on
unmounting nodes (impossible in pure CSS + React conditional rendering —
needs JS orchestration; the codebase has ZERO unmount orchestration today).

| # | Surface | Current | Class | Treatment |
|---|---------|---------|-------|-----------|
| 1 | Block hover rail (.fe-block-rail, styles.css ~574) | display none→flex, snaps both ways (pure CSS toggle, not React-mounted) | a | CSS-only: opacity+visibility swap (120ms) + 2px settle |
| 2 | Variant menu (rail chip, BlockEditFrame) | no enter/exit | b+c | rise-in enter; Presence exit 120ms |
| 3 | Insert plus/pill | 120ms transitions shipped in V1.2 | a | done |
| 4 | QuickAddStrip (Canvas insertAt) | no enter, no exit — most visible snap in the app | b+c | spring scale/translate enter from the plus disc; Presence exit |
| 5 | BlockLibrary panel+scrim | panel slides IN; scrim has no fade; both vanish on close | b+c | Presence wraps both; scrim fade, panel slide-out |
| 6 | Settings drawer content | width animates 200ms but SettingsPanel unmounts instantly — drawer collapses EMPTY | c | Presence renders the .fe-drawer wrapper; content stays mounted until width transition ends |
| 7 | Outline collapse | width 200ms + inert, stays mounted | a | done |
| 8 | Outline hover controls | display toggle — DELIBERATE (V5C: fade would reserve ~56px of rail) | — | leave |
| 9 | Anvil Popover | enter rise-in (V5B); exit unmounts instantly (hits all 5 SelectionToolbar popovers) | c | Presence inside Popover, API unchanged |
| 10 | Anvil Dialog | backdrop/panel enter; exit snaps (callers unmount) | c | optional `open` prop + internal Presence; migrate dialogs incrementally |
| 11 | Toast | slide-in enter; dismiss filters the array — exit snaps, siblings jump | c | exiting-list pattern in ToastHost; slide-out + margin collapse so siblings glide |
| 12 | Quiz add-question menu (.fq-add-menu) | no enter/exit | b+c | same as #2 (or migrate to Anvil Popover and inherit #9) |
| 13 | PreviewOverlay | hard cut both ways | b+c | backdrop fade + scale(0.98)→1 enter; Presence fade exit |
| 14 | Conflict/restore banners | snap in/out AND shift the layout column | b+c+height | Collapse (height) + opacity |
| 15 | Save badge | tone crossfade shipped V5C | a | done |
| 16 | Library rail items | hover/active color snap | a | one-line transition |
| 17 | Settings Format <details> | native snap | b | deferred (::details-content is Chrome-only) |
| 18 | Anvil Drawer | asymmetric enter/exit, content mounted | a | done |

## 2. Options

### A — @mantine/core Transition/Collapse: DECLINED
Fairly stated, Mantine's Transition/Collapse are logic-only (no styles.css
import needed for just those two) and battle-tested: named presets, solved
height-auto edge cases, years of interruption fixes, zero maintenance for us.
But: every Mantine component requires MantineProvider at the root, which
injects a second global theming system (CSS vars + data-mantine-color-scheme
on <html>) beside Anvil; it pulls @mantine/core + @mantine/hooks (~20-40 KB
tree-shaken, unverified — sandbox can't install); its motion contract
(duration={160} JS numbers, respectReducedMotion theme flag) sits OUTSIDE
Anvil's --an-duration-* / prefers-reduced-motion-zeroes-tokens contract,
splitting motion into two sources of truth; and — decisively — most class-(c)
gaps live INSIDE @forge/ui (Popover, Dialog, Toast), so fixing them with
Mantine makes the design system depend on Mantine, reversing the approved
zero-dep extraction decision (decisions.md D2, "use this across future
apps"). Using Mantine only in the editor would leave Anvil's own components
snapping.

### B — Anvil-native primitives: RECOMMENDED
~150 lines total, react-only, shipped inside @forge/ui so they travel with
the system. Enters stay pure CSS (they already work); Presence solves only
the exit half. Reduced motion is free twice over: token durations zero out,
and a computed-style duration probe skips the wait (no 400ms inert ghosts).

### C — modern CSS only: absorbed into B
@starting-style + transition-behavior: allow-discrete (Chrome 117+, Safari
~17.4, Firefox 129+) is used for transition-based enters where handy.
interpolate-size: allow-keywords is Chrome-only — not built on (noted in
Collapse as the future simplification). CSS cannot animate a node React has
unmounted, and keeping QuickAddStrip/BlockLibrary/dialogs permanently mounted
changes real behavior (mount-time focus, recents snapshot, focus traps) — so
C alone cannot cover class (c).

## 3. Primitives

### Presence (packages/ui/src/components/Presence.tsx, ~90 lines)
```tsx
interface PresenceProps {
  open: boolean;
  timeout?: number;            // transitionend ceiling, default 400ms
  onExited?: () => void;
  children: (p: { ref: RefCallback<HTMLElement>; "data-state": "open" | "closed" }) => ReactElement;
}
```
State machine unmounted | open | closing. open→ render data-state="open"
(no JS enter — CSS owns enters, so initial-mount suppression is free).
close→ data-state="closed", unmount on the earliest of transitionend /
animationend / transitioncancel WITH event.target === node (child transitions
bubble — must filter), or timeout. Zero-duration probe via getComputedStyle:
all durations 0 → unmount synchronously. Interruptible: reopening during
"closing" clears timers/listeners and reverses the CSS transition from
current computed values.

### Collapse (packages/ui/src/components/Collapse.tsx, ~60 lines)
```tsx
interface CollapseProps extends ComponentPropsWithRef<"div"> {
  open: boolean;
  keepMounted?: boolean; // default true
}
```
.an-collapse: overflow hidden; height transition on --an-duration-200
--an-ease-standard. Open: 0 → scrollHeight px, set height auto on
transitionend. Close: pin auto → offsetHeight px, force reflow, then 0.
Double-rAF on the opening frame; same zero-duration probe. Measured px, not
interpolate-size (Chrome-only; noted as future simplification).

Both exported from @forge/ui index; styleguide specimens added.

## 4. Execution chunks

| Chunk | Contents | Size |
|---|---|---|
| M1 | Presence + Collapse + exports + components.css base/exit rules + styleguide specimens | M |
| M2 | Popover internal exit (API unchanged; SelectionToolbar popovers inherit) — #9 | S |
| M3 | Dialog optional `open` prop + Presence; migrate MediaPicker first (already open-controlled), then LessonHeaderDialog, ThemeEditor/LabelSetEditor/publish — #10 | M |
| M4 | Toast exit orchestration — #11 | S |
| M5 | Editor chrome adoption: QuickAddStrip, BlockLibrary scrim+panel, variant menu, quiz add menu, preview overlay, block-rail CSS fix — #1 #2 #4 #5 #12 #13 | M |
| M6 | Settings drawer content hold — #6 | S |
| M7 | Banners → Collapse + fade; library rail-item transition — #14 #16 | S |

M1 first; M2–M7 independent. All exit styling is plain token-driven CSS on
[data-state="closed"] — no raw duration literals (D3 grep discipline), no
star-slash in comment bodies (contract rule 6).

## 5. Verification
Per chunk: ui + editor tsc, node scripts/contract-check.mjs,
node e2e/smoke/render-smoke.mjs, node scripts/make-styleguide.mjs (ui
chunks). Mac visual pass: interrupt open/close mid-animation repeatedly;
toggle OS reduced-motion (everything instant, including unmounts — no
delayed ghosts); keyboard-dismiss the library (focus returns before unmount
completes).

Decision to record in docs/design-system/decisions.md on completion: motion
primitives are Anvil-owned; Mantine evaluated and declined (zero-dep), with
the what-we-gave-up list from §2A.

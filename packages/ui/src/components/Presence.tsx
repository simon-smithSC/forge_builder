// Exit orchestration for conditionally rendered nodes (docs/MOTION-PLAN.md
// §3). CSS owns enters: the node mounts with data-state="open" and its
// entrance keyframe fires as before. Presence only solves the exit half —
// when `open` flips false the node stays in the tree with
// data-state="closed" so token-driven exit CSS can run, and unmounts on the
// earliest of transitionend / animationend (filtered to the node itself;
// child transitions bubble) or `timeout`. A computed-style probe unmounts
// synchronously when every transition AND animation duration is zero, which
// is exactly the reduced-motion case (anvil.css zeroes the duration tokens)
// — no delayed inert ghosts. Reopening during the closing phase cancels the
// pending unmount and lets CSS reverse from current values.
//
// Interruption hardening (spam-click regression, see QuickAddStrip):
// - `transitioncancel` is NOT an exit signal. Reopening mid-exit retargets
//   the running transition, which fires transitioncancel on the node — the
//   one moment we must NOT unmount. A close whose transition dies some other
//   way is swept up by `timeout`.
// - `animationend` from an animation that was already running when the close
//   began (an entrance keyframe still playing during a fast open→close) is
//   ignored; only animations the closed state itself starts count as exits.
// - Every unmount path re-checks the CURRENT `open` (via ref): exit signals
//   race the reopen commit (data-state flips back to "open" before this
//   effect's cleanup detaches listeners), and a stale signal landing in that
//   window used to unmount the node while open was true.
// - The phase effect is keyed on (open, phase), not just open: `open` with
//   any non-"open" phase converges back to "open", so no interleaving can
//   park the machine in an unmounted-while-open dead state. The old
//   open-keyed effect made that state absorbing — the next click re-set the
//   same `open=true` and nothing ever remounted.
import type { ReactElement, RefCallback } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PresenceChildProps {
  ref: RefCallback<HTMLElement>;
  "data-state": "open" | "closed";
}

export interface PresenceProps {
  open: boolean;
  /** Unmount ceiling in ms if no transition/animation end arrives. Default 400. */
  timeout?: number;
  /** Fires after the node has actually left the tree. */
  onExited?: (() => void) | undefined;
  children: (props: PresenceChildProps) => ReactElement;
}

type Phase = "unmounted" | "open" | "closing";

function allZero(durationList: string): boolean {
  // "0s, 0.16s" -> false; "0s, 0s" -> true. parseFloat handles both s and ms.
  return durationList
    .split(",")
    .every((part) => parseFloat(part.trim()) === 0 || part.trim() === "");
}

/** Names of CSS animations currently running on the node (empty set when
 * getAnimations is unavailable, e.g. very old engines or non-DOM tests). */
function runningAnimationNames(node: HTMLElement): Set<string> {
  const names = new Set<string>();
  if (typeof node.getAnimations !== "function") return names;
  for (const animation of node.getAnimations()) {
    const name = (animation as CSSAnimation).animationName;
    if (typeof name === "string" && name.length > 0) names.add(name);
  }
  return names;
}

export function Presence({
  open,
  timeout = 400,
  onExited,
  children,
}: PresenceProps): ReactElement | null {
  const [phase, setPhase] = useState<Phase>(open ? "open" : "unmounted");
  const nodeRef = useRef<HTMLElement | null>(null);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  // Render-time snapshot read by exit handlers: a signal that arrives after
  // a reopen committed must be dropped, never unmount an open node.
  const openRef = useRef(open);
  openRef.current = open;

  const setNodeRef: RefCallback<HTMLElement> = useCallback((node) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    if (open) {
      // Covers first open, reopen during "closing" (the closing effect below
      // cleans up its listeners/timer when phase leaves "closing", and CSS
      // reverses the transition from current computed values), and recovery
      // from any premature unmount that slipped through while open was true.
      if (phase !== "open") setPhase("open");
      return;
    }
    if (phase === "open") setPhase("closing");
  }, [open, phase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const node = nodeRef.current;
    let timer = 0;
    const finish = (): void => {
      window.clearTimeout(timer);
      // Stale exit signal racing a reopen (see header): the reopen owns the
      // node now; the (open, phase) effect is already converging to "open".
      if (openRef.current) return;
      setPhase("unmounted");
      onExitedRef.current?.();
    };
    if (!node) {
      finish();
      return;
    }
    // Zero-duration probe: with data-state="closed" already applied, if
    // nothing can animate (reduced motion zeroes the tokens), skip the wait.
    const style = getComputedStyle(node);
    if (allZero(style.transitionDuration) && allZero(style.animationDuration)) {
      finish();
      return;
    }
    // Animations already in flight when the close begins are entrances, not
    // exits — their end must not unmount the node mid exit-transition.
    const preexisting = runningAnimationNames(node);
    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.target === node) finish();
    };
    const onAnimationEnd = (event: AnimationEvent): void => {
      if (event.target !== node) return;
      // A close that lands while the entrance keyframe is still playing gets
      // its exit transition masked (animation-driven values never trigger
      // transitions), so when that entrance ends nothing else may be running.
      // Deliberately let the `timeout` backstop unmount in that corner: the
      // node is already at its closed computed values (invisible, and exit
      // CSS sets pointer-events: none), while unmounting here would blink —
      // a reopen a few ms later (spam-clicking) remounts and replays the
      // entrance instead of smoothly reversing the still-mounted node.
      if (preexisting.has(event.animationName)) return;
      finish();
    };
    node.addEventListener("transitionend", onTransitionEnd);
    node.addEventListener("animationend", onAnimationEnd);
    timer = window.setTimeout(finish, timeout);
    return () => {
      node.removeEventListener("transitionend", onTransitionEnd);
      node.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(timer);
    };
  }, [phase, timeout]);

  if (phase === "unmounted") return null;
  return children({
    ref: setNodeRef,
    "data-state": phase === "open" ? "open" : "closed",
  });
}

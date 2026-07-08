// Exit orchestration for conditionally rendered nodes (docs/MOTION-PLAN.md
// §3). CSS owns enters: the node mounts with data-state="open" and its
// entrance keyframe fires as before. Presence only solves the exit half —
// when `open` flips false the node stays in the tree with
// data-state="closed" so token-driven exit CSS can run, and unmounts on the
// earliest of transitionend / animationend / transitioncancel (filtered to
// the node itself; child transitions bubble) or `timeout`. A computed-style
// probe unmounts synchronously when every transition AND animation duration
// is zero, which is exactly the reduced-motion case (anvil.css zeroes the
// duration tokens) — no delayed inert ghosts. Reopening during the closing
// phase cancels the pending unmount and lets CSS reverse from current values.
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

  const setNodeRef: RefCallback<HTMLElement> = useCallback((node) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    if (open) {
      // Also covers reopening during "closing": the closing effect below
      // cleans up its listeners/timer when phase leaves "closing", and CSS
      // reverses the transition from current computed values.
      setPhase("open");
      return;
    }
    setPhase((prev) => (prev === "open" ? "closing" : prev));
  }, [open]);

  useEffect(() => {
    if (phase !== "closing") return;
    const node = nodeRef.current;
    let timer = 0;
    const finish = (): void => {
      window.clearTimeout(timer);
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
    const onEnd = (event: Event): void => {
      if (event.target === node) finish();
    };
    node.addEventListener("transitionend", onEnd);
    node.addEventListener("transitioncancel", onEnd);
    node.addEventListener("animationend", onEnd);
    timer = window.setTimeout(finish, timeout);
    return () => {
      node.removeEventListener("transitionend", onEnd);
      node.removeEventListener("transitioncancel", onEnd);
      node.removeEventListener("animationend", onEnd);
      window.clearTimeout(timer);
    };
  }, [phase, timeout]);

  if (phase === "unmounted") return null;
  return children({
    ref: setNodeRef,
    "data-state": phase === "open" ? "open" : "closed",
  });
}

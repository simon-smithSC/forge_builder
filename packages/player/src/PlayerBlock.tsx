// Player-owned entrance wrapper (docs/PLAYER-UX-PLAN.md U1). The editor
// canvas mounts BlockView directly and never sees this component, so the
// module-identity contract (canvas never animates) holds by construction.

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import {
  ENTRANCE_FALLBACK_MS,
  ENTRANCE_ROOT_MARGIN,
  entranceDelaySeconds,
} from "./entrance.js";
import type { EntranceKind } from "./entrance.js";

export interface PlayerBlockProps {
  /**
   * Effective animation, already resolved (course setting x block override x
   * prefers-reduced-motion). "none" renders children visible with no observer.
   */
  kind: EntranceKind;
  /** Index within the currently revealing batch (Rise --idx; resets per batch). */
  staggerIndex: number;
  /**
   * Rise's initiallyVisible: content restored on resume (already consumed)
   * renders visible without replaying the entrance. Captured at mount.
   */
  initiallyVisible: boolean;
  children: ReactNode;
}

/**
 * Wraps one BlockView in the lesson view. Starts hidden (fp-enter +
 * fp-enter-<kind>), reveals via fp-enter-in when an IntersectionObserver
 * (rootMargin "2% 0px", threshold 0, unobserve on fire) sees it, or after the
 * 1000ms fallback timer, matching Rise's scroll-animation trigger. The
 * transition itself lives in styles.css (opacity/transform 1s ease-out);
 * the per-block stagger is an inline transition-delay.
 */
export function PlayerBlock({
  kind,
  staggerIndex,
  initiallyVisible,
  children,
}: PlayerBlockProps): ReactElement {
  // Captured once: later prop flips (e.g. the block getting consumed) must
  // not restart or cancel an in-flight entrance.
  const [animated] = useState(() => kind !== "none" && !initiallyVisible);
  const [entered, setEntered] = useState(!animated);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!animated || entered) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // SSR hydration or observer-less environments never strand content.
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          setEntered(true);
        }
      },
      { rootMargin: ENTRANCE_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(el);
    const fallback = window.setTimeout(
      () => setEntered(true),
      ENTRANCE_FALLBACK_MS,
    );
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [animated, entered]);

  if (!animated) {
    return <div className="fp-block">{children}</div>;
  }
  const style: CSSProperties = {
    transitionDelay: `${entranceDelaySeconds(staggerIndex)}s`,
  };
  const classes = `fp-block fp-enter fp-enter-${kind}${entered ? " fp-enter-in" : ""}`;
  return (
    <div ref={ref} className={classes} style={style}>
      {children}
    </div>
  );
}

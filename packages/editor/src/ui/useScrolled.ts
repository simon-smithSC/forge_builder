// Scroll-aware chrome (5B.2): tracks whether a scroll container has moved
// off its top, so the topbar can idle flat and gain elevation only once
// content actually slides beneath it. rAF-throttled; shared by EditorScreen
// (.fe-canvas) and CourseOverview (.fe-ov-main).
import { useCallback, useEffect, useRef, useState } from "react";

export interface ScrolledHandle<T extends HTMLElement> {
  /** Callback ref for the scroll container. Reattaches safely when the
      container remounts (e.g. the canvas swaps lesson types). */
  scrollRef: (node: T | null) => void;
  /** True while scrollTop > 0. */
  scrolled: boolean;
}

export function useScrolled<T extends HTMLElement>(): ScrolledHandle<T> {
  const [scrolled, setScrolled] = useState(false);
  const nodeRef = useRef<T | null>(null);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const scrollRef = useCallback((node: T | null): void => {
    if (node === nodeRef.current) return;
    cleanupRef.current?.();
    cleanupRef.current = null;
    nodeRef.current = node;
    if (node === null) {
      setScrolled(false);
      return;
    }
    const update = (): void => {
      frameRef.current = null;
      setScrolled(node.scrollTop > 0);
    };
    const onScroll = (): void => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(update);
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    update();
    cleanupRef.current = () => {
      node.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  // Unmount: drop the listener and any queued frame.
  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  return { scrollRef, scrolled };
}

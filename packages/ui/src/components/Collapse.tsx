// Animated height reveal (docs/MOTION-PLAN.md §3). CSS cannot transition
// height auto <-> 0, so Collapse measures: opening goes 0 -> scrollHeight px
// (double-rAF so the browser has painted the start frame) and settles on
// height auto at transitionend; closing pins auto -> offsetHeight px, forces
// a reflow, then goes to 0. Uses measured px, not interpolate-size
// (Chrome-only; future simplification). The same zero-duration probe as
// Presence makes reduced motion instant. Height is managed imperatively and
// never appears in the style prop, so parent re-renders cannot clobber a
// transition in flight.
import type { ComponentPropsWithRef, ReactElement, Ref } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { cx } from "./util.js";

export interface CollapseProps extends ComponentPropsWithRef<"div"> {
  open: boolean;
  /** Keep the (inert, aria-hidden) content mounted while closed. Default true. */
  keepMounted?: boolean;
}

function applyRef(ref: Ref<HTMLDivElement> | undefined, node: HTMLDivElement | null): void {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

function transitionsInstantly(node: HTMLElement): boolean {
  return getComputedStyle(node)
    .transitionDuration.split(",")
    .every((part) => parseFloat(part.trim()) === 0);
}

export function Collapse({
  open,
  keepMounted = true,
  className,
  children,
  ref,
  ...rest
}: CollapseProps): ReactElement | null {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const mountedRef = useRef(false);
  // exited: the close transition has fully finished (drives keepMounted=false
  // unmounting). Cleared synchronously on reopen via the render-phase check.
  const [exited, setExited] = useState(!open);
  if (open && exited) setExited(false);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!mountedRef.current) {
      // Initial commit renders the final state without animating (node may be
      // null here when keepMounted=false starts closed).
      mountedRef.current = true;
      if (node) node.style.height = open ? "auto" : "0px";
      return;
    }
    if (!node) return;
    let raf1 = 0;
    let raf2 = 0;
    if (open) {
      // Fresh/settled nodes start from 0; a node interrupted mid-close keeps
      // its current px so the transition reverses from where it is.
      if (node.style.height === "" || node.style.height === "auto") {
        node.style.height = "0px";
      }
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          const target = node.scrollHeight;
          node.style.height = transitionsInstantly(node) ? "auto" : `${target}px`;
        });
      });
    } else {
      node.style.height = `${node.offsetHeight}px`;
      void node.offsetHeight; // commit the pinned height before transitioning
      if (transitionsInstantly(node)) {
        node.style.height = "0px";
        setExited(true);
      } else {
        node.style.height = "0px";
      }
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open]);

  if (!keepMounted && !open && exited) return null;

  return (
    <div
      {...rest}
      className={cx("an-collapse", className)}
      data-state={open ? "open" : "closed"}
      aria-hidden={open ? undefined : true}
      {...(open ? {} : { inert: true })}
      ref={(node) => {
        nodeRef.current = node;
        applyRef(ref, node);
      }}
      onTransitionEnd={(event) => {
        rest.onTransitionEnd?.(event);
        const node = nodeRef.current;
        if (!node || event.target !== node || event.propertyName !== "height") return;
        if (openRef.current) {
          node.style.height = "auto"; // content can now resize freely
        } else {
          setExited(true);
        }
      }}
    >
      {children}
    </div>
  );
}

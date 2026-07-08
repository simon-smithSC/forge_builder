// Simple imperative toast system: render <ToastHost /> once near the app
// root, call toast("Published", { tone: "success" }) from anywhere. No
// context, no portal; the host is a fixed-position live region.
// Motion M4: dismissal moves a toast into a local exiting list instead of
// dropping it from the DOM. Each toast renders under a Presence whose `open`
// flips false on dismissal, so [data-state="closed"] plays slide-out + fade
// while the pinned inline height and margin collapse to 0 — siblings glide up
// instead of jumping. Presence unmounts on transitionend (target-checked) or
// its 400ms ceiling, then onExited drops the entry. Auto-dismiss timers
// cannot double-fire: dismissToast on an already-removed id is a no-op for
// the exiting list because removals are diffed from the store list only.
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { Tone } from "./util.js";
import { Presence } from "./Presence.js";

export interface ToastOptions {
  tone?: Tone;
  /** ms before auto-dismiss; 0 keeps it until dismissed. Default 4000. */
  duration?: number;
}

export interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<(next: ToastItem[]) => void>();

function emit(): void {
  for (const listener of listeners) listener(items);
}

export function dismissToast(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

/** Show a toast. Returns the id (usable with dismissToast). */
export function toast(message: string, options: ToastOptions = {}): number {
  const id = nextId;
  nextId += 1;
  items = [...items, { id, message, tone: options.tone ?? "neutral" }];
  emit();
  const duration = options.duration ?? 4000;
  if (duration > 0) setTimeout(() => dismissToast(id), duration);
  return id;
}

export function ToastHost(): ReactElement {
  const [list, setList] = useState<ToastItem[]>(items);
  const [exiting, setExiting] = useState<ToastItem[]>([]);
  const listRef = useRef(list);
  const nodesRef = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    const onChange = (next: ToastItem[]): void => {
      const prev = listRef.current;
      listRef.current = next;
      const nextIds = new Set(next.map((item) => item.id));
      const removed = prev.filter((item) => !nextIds.has(item.id));
      if (removed.length > 0) {
        // Collapse height inline: auto -> 0 cannot transition, so pin the
        // measured px, commit it with a reflow, then head for 0. Inline style
        // (not the [data-state="closed"] rule) must own height, because an
        // inline pin would beat any stylesheet value. Padding and margin
        // collapse via the closed rule in the same frame.
        for (const item of removed) {
          const node = nodesRef.current.get(item.id);
          if (node) {
            node.style.height = `${node.offsetHeight}px`;
            void node.offsetHeight;
            node.style.height = "0px";
          }
        }
        setExiting((current) => [
          ...current,
          ...removed.filter((item) => !current.some((e) => e.id === item.id)),
        ]);
      }
      setList(next);
    };
    listeners.add(onChange);
    onChange(items);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  // ids are monotonic, so sorting the union by id preserves stacking order
  // and keeps an exiting toast in place among its siblings.
  const liveIds = new Set(list.map((item) => item.id));
  const rendered = [...list, ...exiting.filter((item) => !liveIds.has(item.id))].sort(
    (a, b) => a.id - b.id,
  );

  return (
    <div className="an-toast-host" role="status" aria-live="polite">
      {rendered.map((item) => {
        const live = liveIds.has(item.id);
        return (
          <Presence
            key={item.id}
            open={live}
            onExited={() =>
              setExiting((current) => current.filter((e) => e.id !== item.id))
            }
          >
            {(presence) => (
              <div
                ref={(node) => {
                  presence.ref(node);
                  if (node) nodesRef.current.set(item.id, node);
                  else nodesRef.current.delete(item.id);
                }}
                data-state={presence["data-state"]}
                className="an-toast"
                data-tone={item.tone}
              >
                <span className="an-toast-message">{item.message}</span>
                <button
                  type="button"
                  className="an-toast-dismiss"
                  aria-label="Dismiss notification"
                  onClick={() => dismissToast(item.id)}
                  {...(live ? {} : { tabIndex: -1 })}
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </Presence>
        );
      })}
    </div>
  );
}

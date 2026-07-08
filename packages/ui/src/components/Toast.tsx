// Simple imperative toast system: render <ToastHost /> once near the app
// root, call toast("Published", { tone: "success" }) from anywhere. No
// context, no portal; the host is a fixed-position live region.
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import type { Tone } from "./util.js";

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

  useEffect(() => {
    listeners.add(setList);
    setList(items);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div className="an-toast-host" role="status" aria-live="polite">
      {list.map((item) => (
        <div key={item.id} className="an-toast" data-tone={item.tone}>
          <span className="an-toast-message">{item.message}</span>
          <button
            type="button"
            className="an-toast-dismiss"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(item.id)}
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
      ))}
    </div>
  );
}

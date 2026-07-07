import { createContext, useContext } from "react";
import type { LabelSet, MediaRef, Theme } from "@forge/schema";
import { defaultLabelSet, defaultTheme } from "@forge/schema";

/**
 * Everything a block renderer needs from its host (editor canvas or player).
 * The SAME component renders in both surfaces; `mode` only toggles affordance
 * hooks (e.g. whether interactions auto-report consumption), never visuals.
 */
export type RenderMode = "edit" | "player";

export interface BlockEvents {
  /** Learner interacted with the block (accordion opened, card flipped...). */
  onInteracted?: (blockId: string, detail?: Record<string, unknown>) => void;
  /** Block reached a completed/consumed state (continue clicked, KC answered). */
  onCompleted?: (blockId: string, detail?: Record<string, unknown>) => void;
  /** Navigate to a lesson (buttons block with lesson destination). */
  onNavigateToLesson?: (lessonId: string) => void;
}

export interface RenderContext {
  mode: RenderMode;
  theme: Theme;
  labels: LabelSet;
  media: Record<string, MediaRef>;
  /**
   * Resolve a mediaId to a displayable URL. Host-specific: the editor serves
   * draft uploads, the player serves package-relative asset paths. Returns
   * undefined when unresolvable; renderers show a placeholder.
   */
  resolveMediaUrl: (mediaId: string) => string | undefined;
  events: BlockEvents;
  /** Block ids already consumed (player resume); renderers may reflect state. */
  consumedBlockIds: ReadonlySet<string>;
}

export const defaultRenderContext: RenderContext = {
  mode: "player",
  theme: defaultTheme,
  labels: defaultLabelSet,
  media: {},
  resolveMediaUrl: () => undefined,
  events: {},
  consumedBlockIds: new Set<string>(),
};

export const BlockRenderContext = createContext<RenderContext>(defaultRenderContext);

export function useRenderContext(): RenderContext {
  return useContext(BlockRenderContext);
}

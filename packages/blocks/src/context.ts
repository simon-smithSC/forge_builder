import { createContext, useContext } from "react";
import type { ReactNode } from "react";
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

/**
 * In-place editing port (Rise parity P1). The EDITOR supplies a render
 * function for html-fragment fields through context; renderers opt in per
 * field via EditableHtml. The player never provides this port, so the
 * runtime bundle stays TipTap-free and renders plain <Html> unchanged.
 */
export interface InlineEditingPort {
  renderHtmlEditor: (args: {
    blockId: string;
    /** JSON path of the html field inside the block payload,
     * e.g. "html", "heading", "columns.0.html", "items.2.html". */
    path: string;
    html: string;
    className?: string;
  }) => ReactNode;
}

export interface RenderContext {
  mode: RenderMode;
  /** Present only on the editor canvas; enables in-place text editing. */
  inlineEditing?: InlineEditingPort;
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
  /**
   * courseSettings.videoPlaybackSpeedControl passed through by the player;
   * absent means true. When false, video renderers suppress the playback
   * speed menu (controlsList="noplaybackrate"). The editor canvas passes true.
   */
  videoPlaybackSpeedControl?: boolean;
}

export const defaultRenderContext: RenderContext = {
  mode: "player",
  theme: defaultTheme,
  labels: defaultLabelSet,
  media: {},
  resolveMediaUrl: () => undefined,
  events: {},
  consumedBlockIds: new Set<string>(),
  videoPlaybackSpeedControl: true,
};

export const BlockRenderContext = createContext<RenderContext>(defaultRenderContext);

export function useRenderContext(): RenderContext {
  return useContext(BlockRenderContext);
}

// In-place rich text editing on the canvas (Rise parity P1). Thin block
// adapter over the commit-agnostic InlineRichText core (POLISH-PLAN V2):
// the core owns the Tiptap instance, sanitize-first commits, and the
// selection toolbar; this file supplies the block commit path - set-at-path
// into a payload clone, entry.validatePayload, then setBlockPayload. Invalid
// HTML never reaches the store.
import type { ReactElement } from "react";
import { useRef } from "react";
import { getRegistryEntry } from "@forge/blocks";
import { InlineRichText } from "../rich/InlineRichText.js";
import { setBlockPayload } from "../../state/actions.js";
import { editorStore } from "../../state/store.js";
import { setAtPath } from "./setAtPath.js";

export interface InlineHtmlEditorProps {
  lessonId: string;
  blockId: string;
  /** Dot path of the html field inside the block payload. */
  path: string;
  html: string;
  className?: string | undefined;
}

function validationMessage(error: unknown): string {
  const issues = (
    error as { issues?: { message?: string; path?: (string | number)[] }[] }
  ).issues;
  const first = issues?.[0];
  if (first?.message) return first.message;
  return error instanceof Error ? error.message : "Invalid value.";
}

export function InlineHtmlEditor({
  lessonId,
  blockId,
  path,
  html,
  className,
}: InlineHtmlEditorProps): ReactElement {
  // Item paths can shift when the drawer reorders items; commit against the
  // latest props, not the ones captured when the editor mounted.
  const targetRef = useRef({ lessonId, blockId, path });
  targetRef.current = { lessonId, blockId, path };

  /** Set-at-path + validatePayload + dispatch. True or an error message. */
  const commit = (nextHtml: string): boolean | string => {
    const target = targetRef.current;
    const course = editorStore.getState().course;
    const lesson = course?.lessons.find((item) => item.id === target.lessonId);
    const block =
      lesson?.type === "blocks"
        ? lesson.blocks.find((item) => item.id === target.blockId)
        : undefined;
    if (!lesson || !block) return false;
    try {
      const entry = getRegistryEntry(block.family);
      const candidate = setAtPath(block.payload, target.path, nextHtml);
      const parsed = entry.validatePayload(candidate, block.variant);
      setBlockPayload(lesson.id, block.id, parsed);
      return true;
    } catch (error) {
      return validationMessage(error);
    }
  };

  return (
    <InlineRichText
      html={html}
      onCommit={commit}
      className={className}
      ariaLabel="Edit text in place"
    />
  );
}

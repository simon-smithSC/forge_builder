// Commit-agnostic in-place rich text core (POLISH-PLAN V2). Owns the Tiptap
// instance, the debounce/blur-commit/revert cycle, and the selection toolbar;
// hosts decide what a commit means via onCommit (block payloads today, the
// course description in V3). The ProseMirror root carries the same fb-html
// classes the shared Html renderer emits, so the text renders exactly like
// player output. Invalid HTML never reaches a host: output is sanitized
// against @forge/schema first, and a failed blur commit reverts the field.
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  normalizeRichTextHtml,
  richTextExtensions,
  sanitizeRichTextHtml,
  stripStyleAttributes,
} from "./richTextConfig.js";
import { SelectionToolbar } from "./SelectionToolbar.js";
import "../inline/inline.css";

const COMMIT_DEBOUNCE_MS = 800;
const ERROR_FLASH_MS = 2600;

export interface InlineRichTextProps {
  html: string;
  /**
   * Persist sanitized HTML. Return true on success; false or an error
   * message on rejection (a failed blur commit reverts the field).
   */
  onCommit: (html: string) => boolean | string;
  /** Extra classes for the content root (joined with fb-html). */
  className?: string | undefined;
  ariaLabel?: string | undefined;
}

export function InlineRichText({
  html,
  onCommit,
  className,
  ariaLabel,
}: InlineRichTextProps): ReactElement {
  const [focused, setFocused] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(normalizeRichTextHtml(html));
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const flashError = (message: string): void => {
    setFlash(message);
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null;
      setFlash(null);
    }, ERROR_FLASH_MS);
  };

  /** Sanitize + delegate to the host commit. True on success. */
  const commitFromEditor = (editor: Editor): boolean => {
    const raw = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (raw === lastCommittedRef.current) return true;
    const sanitized = sanitizeRichTextHtml(raw);
    if (!sanitized.ok) {
      flashError(sanitized.message);
      return false;
    }
    const result = onCommitRef.current(sanitized.html);
    if (result !== true) {
      flashError(typeof result === "string" ? result : "Invalid value.");
      return false;
    }
    lastCommittedRef.current = sanitized.html;
    setFlash(null);
    return true;
  };

  const clearPending = (): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const editor = useEditor({
    extensions: richTextExtensions,
    content: html,
    editorProps: {
      attributes: {
        class: className
          ? `fb-html ${className} fe-inline-content`
          : "fb-html fe-inline-content",
        "aria-label": ariaLabel ?? "Edit text in place",
      },
      transformPastedHTML: stripStyleAttributes,
    },
    onUpdate: ({ editor: current }) => {
      clearPending();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        commitFromEditor(current);
      }, COMMIT_DEBOUNCE_MS);
    },
    onFocus: () => setFocused(true),
    onBlur: ({ editor: current }) => {
      setFocused(false);
      clearPending();
      if (!commitFromEditor(current)) {
        // Revert the field so the canvas never shows uncommittable content.
        current.commands.setContent(lastCommittedRef.current, false);
      }
    },
  });

  // External value changes (undo/redo, drawer edits, variant switch): resync
  // the document unless the author is mid-edit in this exact field. The
  // committed baseline is then re-read from the editor's own serialization:
  // getHTML attribute ordering can differ from the stored string, and a raw
  // string-equality debounce would otherwise re-commit an identical document.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = normalizeRichTextHtml(html);
    if (editor.isFocused) {
      lastCommittedRef.current = incoming;
      return;
    }
    const current = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
      setFlash(null);
    }
    lastCommittedRef.current = editor.isEmpty
      ? ""
      : normalizeRichTextHtml(editor.getHTML());
  }, [editor, html]);

  // Flush a pending debounced commit on unmount (block deselect, reorder,
  // variant switch) so keystrokes are not dropped.
  useEffect(() => {
    if (!editor) return undefined;
    return () => {
      if (timerRef.current !== null) {
        clearPending();
        if (!editor.isDestroyed) commitFromEditor(editor);
      }
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className={`fe-inline-editor${focused ? " fe-inline-editor-focused" : ""}`}>
      {editor ? <SelectionToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
      {flash ? (
        <span className="fe-inline-error" role="alert">
          {flash}
        </span>
      ) : null}
    </div>
  );
}

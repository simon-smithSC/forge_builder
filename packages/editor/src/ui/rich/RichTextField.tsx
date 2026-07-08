// TipTap-backed rich text field for sanitized HTML fragment values. Follows
// the editor-wide draft-state contract: the ProseMirror document is the
// draft, and we only commit (on blur and 800ms after the last change) after
// the serialized HTML passes the @forge/schema sanitizer. Invalid output
// shows an inline message and is never committed. Formatting lives in the
// shared selection toolbar (POLISH-PLAN V2); the static button row is gone.
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
import "./rich.css";

const COMMIT_DEBOUNCE_MS = 800;

export interface RichTextFieldProps {
  label: string;
  value: string;
  onCommit: (html: string) => void;
  required?: boolean | undefined;
  /** Message from an upstream rejected commit (dispatcher validation). */
  error?: string | undefined;
  hint?: string | undefined;
}

export function RichTextField({
  label,
  value,
  onCommit,
  required,
  error,
  hint,
}: RichTextFieldProps): ReactElement {
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(value.trim() === "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(normalizeRichTextHtml(value));
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Reads only refs and stable setters so the closure captured by the editor
  // event handlers never goes stale across renders.
  const commitFromEditor = (editor: Editor): void => {
    const html = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (html === lastCommittedRef.current) return;
    const result = sanitizeRichTextHtml(html);
    if (!result.ok) {
      setInvalidMessage(result.message);
      return;
    }
    lastCommittedRef.current = result.html;
    setInvalidMessage(null);
    onCommitRef.current(result.html);
  };

  const clearPending = (): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const editor = useEditor({
    extensions: richTextExtensions,
    content: value,
    editorProps: {
      attributes: { class: "fe-rich-content", "aria-label": label },
      transformPastedHTML: stripStyleAttributes,
    },
    onUpdate: ({ editor: current }) => {
      setIsEmpty(current.isEmpty);
      clearPending();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        commitFromEditor(current);
      }, COMMIT_DEBOUNCE_MS);
    },
    onBlur: ({ editor: current }) => {
      clearPending();
      commitFromEditor(current);
    },
  });

  // External value changes (undo/redo, variant switch): resync the document
  // unless the author is mid-edit in this exact field. The committed baseline
  // is then re-read from the editor's own serialization: getHTML attribute
  // ordering can differ from the stored string, and a raw string-equality
  // debounce would otherwise re-commit an identical document.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = normalizeRichTextHtml(value);
    if (editor.isFocused) {
      lastCommittedRef.current = incoming;
      return;
    }
    const current = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
      setIsEmpty(editor.isEmpty);
      setInvalidMessage(null);
    }
    lastCommittedRef.current = editor.isEmpty
      ? ""
      : normalizeRichTextHtml(editor.getHTML());
  }, [editor, value]);

  // Flush a pending debounced commit if the field unmounts mid-edit
  // (variant switch, block deselect) so keystrokes are not dropped.
  useEffect(() => {
    if (!editor) return undefined;
    return () => {
      if (timerRef.current !== null) {
        clearPending();
        if (!editor.isDestroyed) commitFromEditor(editor);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const message = invalidMessage ?? error ?? null;

  return (
    <div className="fe-field fe-rich-field">
      <span className="fe-field-label">
        {label}
        {required ? <span className="fe-pl-required">Required</span> : null}
      </span>
      <div className="fe-rich-editor">
        {editor ? <SelectionToolbar editor={editor} /> : null}
        <EditorContent editor={editor} className="fe-rich-surface" />
      </div>
      {hint ? <span className="fe-pl-hint">{hint}</span> : null}
      {message ? (
        <span className="fe-field-error" role="alert">
          {message}
        </span>
      ) : null}
      {required && isEmpty && message === null ? (
        <span className="fe-field-error">{label} is required.</span>
      ) : null}
    </div>
  );
}

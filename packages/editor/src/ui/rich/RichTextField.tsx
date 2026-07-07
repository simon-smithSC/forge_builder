// TipTap-backed rich text field for sanitized HTML fragment values. Follows
// the editor-wide draft-state contract: the ProseMirror document is the
// draft, and we only commit (on blur and 800ms after the last change) after
// the serialized HTML passes the @forge/schema sanitizer. Invalid output
// shows an inline message and is never committed.
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  TextQuote,
} from "lucide-react";
import {
  normalizeRichTextHtml,
  richTextExtensions,
  sanitizeRichTextHtml,
  stripStyleAttributes,
} from "./richTextConfig.js";
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

interface ToolbarAction {
  key: string;
  title: string;
  icon: LucideIcon;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const TOOLBAR_ACTIONS: readonly ToolbarAction[] = [
  {
    key: "bold",
    title: "Bold",
    icon: Bold,
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    key: "italic",
    title: "Italic",
    icon: Italic,
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    key: "strike",
    title: "Strikethrough",
    icon: Strikethrough,
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    key: "code",
    title: "Inline code",
    icon: Code,
    isActive: (editor) => editor.isActive("code"),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    key: "h2",
    title: "Heading 2",
    icon: Heading2,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    key: "h3",
    title: "Heading 3",
    icon: Heading3,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    key: "bulletList",
    title: "Bullet list",
    icon: List,
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    key: "orderedList",
    title: "Ordered list",
    icon: ListOrdered,
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    key: "blockquote",
    title: "Blockquote",
    icon: TextQuote,
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
];

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
  // unless the author is mid-edit in this exact field.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = normalizeRichTextHtml(value);
    lastCommittedRef.current = incoming;
    if (editor.isFocused) return;
    const current = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
      setIsEmpty(editor.isEmpty);
      setInvalidMessage(null);
    }
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
        {editor ? (
          <div className="fe-rich-toolbar" role="toolbar" aria-label={`${label} formatting`}>
            {TOOLBAR_ACTIONS.map((action) => {
              const Icon = action.icon;
              const active = action.isActive(editor);
              return (
                <button
                  key={action.key}
                  type="button"
                  className={active ? "fe-rich-btn fe-rich-btn-active" : "fe-rich-btn"}
                  aria-pressed={active}
                  title={action.title}
                  aria-label={action.title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => action.run(editor)}
                >
                  <Icon size={14} aria-hidden />
                </button>
              );
            })}
          </div>
        ) : null}
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

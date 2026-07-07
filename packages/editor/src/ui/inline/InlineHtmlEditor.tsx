// In-place rich text editing on the canvas (Rise parity P1). This is the
// editor-side implementation of the @forge/blocks InlineEditingPort: a
// borderless TipTap instance styled to look exactly like the rendered text
// (the ProseMirror root carries the same fb-html classes Html would emit),
// with a floating minimal toolbar above the focused field. Commits follow
// the editor-wide validate-before-commit discipline: sanitize, set-at-path
// into a payload clone, entry.validatePayload, then setBlockPayload. Invalid
// HTML never reaches the store; a failed blur commit reverts the field.
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered } from "lucide-react";
import { getRegistryEntry } from "@forge/blocks";
import {
  normalizeRichTextHtml,
  richTextExtensions,
  sanitizeRichTextHtml,
  stripStyleAttributes,
} from "../rich/richTextConfig.js";
import { setBlockPayload } from "../../state/actions.js";
import { editorStore } from "../../state/store.js";
import { setAtPath } from "./setAtPath.js";
import "./inline.css";

const COMMIT_DEBOUNCE_MS = 800;
const ERROR_FLASH_MS = 2600;

export interface InlineHtmlEditorProps {
  lessonId: string;
  blockId: string;
  /** Dot path of the html field inside the block payload. */
  path: string;
  html: string;
  className?: string | undefined;
}

interface InlineAction {
  key: string;
  title: string;
  icon: LucideIcon;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const INLINE_ACTIONS: readonly InlineAction[] = [
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
];

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
  const [focused, setFocused] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef(normalizeRichTextHtml(html));
  // Item paths can shift when the drawer reorders items; commit against the
  // latest props, not the ones captured when the TipTap instance mounted.
  const targetRef = useRef({ lessonId, blockId, path });
  targetRef.current = { lessonId, blockId, path };

  const flashError = (message: string): void => {
    setFlash(message);
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null;
      setFlash(null);
    }, ERROR_FLASH_MS);
  };

  /** Sanitize + set-at-path + validatePayload + dispatch. True on success. */
  const commitFromEditor = (editor: Editor): boolean => {
    const raw = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (raw === lastCommittedRef.current) return true;
    const sanitized = sanitizeRichTextHtml(raw);
    if (!sanitized.ok) {
      flashError(sanitized.message);
      return false;
    }
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
      const candidate = setAtPath(block.payload, target.path, sanitized.html);
      const parsed = entry.validatePayload(candidate, block.variant);
      setBlockPayload(lesson.id, block.id, parsed);
      lastCommittedRef.current = sanitized.html;
      setFlash(null);
      return true;
    } catch (error) {
      flashError(validationMessage(error));
      return false;
    }
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
        "aria-label": "Edit text in place",
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
  // the document unless the author is mid-edit in this exact field.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = normalizeRichTextHtml(html);
    lastCommittedRef.current = incoming;
    if (editor.isFocused) return;
    const current = editor.isEmpty ? "" : normalizeRichTextHtml(editor.getHTML());
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
      setFlash(null);
    }
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
      {focused && editor ? (
        <div
          className="fe-inline-toolbar"
          role="toolbar"
          aria-label="Text formatting"
        >
          {INLINE_ACTIONS.map((action) => {
            const Icon = action.icon;
            const active = action.isActive(editor);
            return (
              <button
                key={action.key}
                type="button"
                className={
                  active ? "fe-inline-btn fe-inline-btn-active" : "fe-inline-btn"
                }
                aria-pressed={active}
                title={action.title}
                aria-label={action.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => action.run(editor)}
              >
                <Icon size={13} aria-hidden />
              </button>
            );
          })}
        </div>
      ) : null}
      <EditorContent editor={editor} />
      {flash ? (
        <span className="fe-inline-error" role="alert">
          {flash}
        </span>
      ) : null}
    </div>
  );
}

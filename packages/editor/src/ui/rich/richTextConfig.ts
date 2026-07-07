// TipTap configuration pinned to the @forge/schema sanitizer subset. The
// editor may only ever produce markup that isSafeHtmlFragment accepts, so the
// StarterKit is trimmed to the allowed tags (p, h2-h4, ul/ol/li, blockquote,
// pre+code, br, strong, em, s, code). History is part of StarterKit and is
// instantiated per editor, so every field gets its own undo stack.
// R2.6: enable link/underline/sup/sub extensions after next pnpm install.
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { isSafeHtmlFragment } from "@forge/schema";

/**
 * Shared extension list for all rich-text fields. StarterKit ships the
 * markdown-style input rules (## , - , 1. , > , ``` ) with these nodes, so
 * they stay enabled for free.
 */
export const richTextExtensions: Extensions = [
  StarterKit.configure({
    // Sanitizer allows h2/h3/h4 only; h1 is reserved for lesson titles.
    heading: { levels: [2, 3, 4] },
    // <hr> is not in the sanitizer allowlist.
    horizontalRule: false,
    // codeBlock stays enabled: it serializes to <pre><code>, both allowed.
  }),
];

export type RichTextSanitizeResult =
  | { ok: true; html: string }
  | { ok: false; message: string };

/** TipTap's serialization of an empty document. */
const EMPTY_DOC_HTML = "<p></p>";

/**
 * Map TipTap's empty-document markup to the empty string so optional fields
 * can be cleared (callers omit keys for "") and comparisons against the
 * committed value do not churn.
 */
export function normalizeRichTextHtml(html: string): string {
  return html === EMPTY_DOC_HTML ? "" : html;
}

/**
 * Validate editor output against the schema sanitizer before it is committed.
 * TipTap output should always pass; this is the belt-and-braces gate that
 * keeps the validate-before-commit contract honest.
 */
export function sanitizeRichTextHtml(html: string): RichTextSanitizeResult {
  const normalized = normalizeRichTextHtml(html);
  if (normalized === "") {
    return { ok: true, html: "" };
  }
  if (isSafeHtmlFragment(normalized)) {
    return { ok: true, html: normalized };
  }
  return {
    ok: false,
    message: "Formatting produced markup outside the allowed HTML subset; not saved.",
  };
}

/**
 * Paste hygiene: ProseMirror already drops nodes/marks outside the schema,
 * but inline style attributes from Word or Google Docs can survive on
 * otherwise-valid tags. Strip them before parsing.
 */
export function stripStyleAttributes(html: string): string {
  return html.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

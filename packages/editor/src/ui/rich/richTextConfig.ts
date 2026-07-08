// TipTap configuration pinned to the @forge/schema sanitizer subset. The
// editor may only ever produce markup that isSafeHtmlFragment accepts:
// semantic tags for discrete marks (strong/em/u/s/sub/sup/a/code/lists/
// h2-h4/blockquote) and inline styles for continuous values (color,
// background-color, font-size px, font-family, text-align, line-height) via
// the V0 style allowlist. History is part of StarterKit and is instantiated
// per editor, so every field gets its own undo stack.
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { isSafeHtmlFragment, isSafeStyleAttribute } from "@forge/schema";
import { FontSize } from "./extensions/fontSize.js";
import { LineHeight } from "./extensions/lineHeight.js";

/** Schemes the sanitizer allows on href; everything else is rejected before
 *  it ever reaches the document (paste, autolink, or the link popover). */
const ALLOWED_LINK_PATTERN = /^(https?:\/\/|mailto:)/i;

export function isAllowedLinkHref(href: string): boolean {
  return ALLOWED_LINK_PATTERN.test(href.trim());
}

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
  Underline,
  Subscript,
  Superscript,
  Link.configure({
    // Editing surface: clicks select, never navigate.
    openOnClick: false,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    // Match the sanitizer's scheme allowlist (http/https/mailto).
    isAllowedUri: (url) => isAllowedLinkHref(url),
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right"],
  }),
  FontFamily,
  FontSize,
  LineHeight,
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

/** Strip-all fallback used when no DOM is available (node-side tests). */
const STYLE_ATTR_PATTERN = /\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * Paste hygiene: ProseMirror already drops nodes/marks outside the schema,
 * but inline style attributes from Word or Google Docs can survive on
 * otherwise-valid tags. Allowlist-aware since V2: declarations that pass the
 * schema's isSafeStyleAttribute for their tag are kept (so pasted colors,
 * sizes, and alignment survive), everything else is dropped; the attribute
 * disappears entirely when nothing survives. Quotes are stripped from
 * font-family values because CSSOM re-quotes names with double quotes, which
 * getHTML escapes to &quot; - a sequence the sanitizer's charset rejects.
 */
export function stripStyleAttributes(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html.replace(STYLE_ATTR_PATTERN, "");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const element of Array.from(doc.body.querySelectorAll("[style]"))) {
    const tag = element.tagName.toLowerCase();
    const kept: string[] = [];
    for (const declaration of (element.getAttribute("style") ?? "").split(";")) {
      let trimmed = declaration.trim();
      if (trimmed === "") continue;
      if (/^font-family\s*:/i.test(trimmed)) {
        trimmed = trimmed.replace(/['"]/g, "");
      }
      if (isSafeStyleAttribute(tag, trimmed)) kept.push(trimmed);
    }
    if (kept.length > 0) element.setAttribute("style", kept.join("; "));
    else element.removeAttribute("style");
  }
  return doc.body.innerHTML;
}

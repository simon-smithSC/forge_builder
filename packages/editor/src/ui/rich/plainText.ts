// Plain-text projection of a sanitized HTML fragment (POLISH-PLAN V3.2).
// course.description stays the canonical plain string (it feeds tincan.xml);
// the editor derives it from descriptionHtml on every commit via this helper.

/** Block-level boundaries get an explicit space before tag-stripping so
 *  "<p>One</p><p>Two</p>" reads "One Two", not "OneTwo". */
function spaceBlockBoundaries(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|div|tr)>/gi, "</$1> ")
    .replace(/<(br|hr)\s*\/?>/gi, " ");
}

/**
 * Strip a sanitized HTML fragment down to collapsed plain text. DOM-based
 * (DOMParser) in the browser; a regex tag-strip fallback keeps the helper
 * usable in node-side tests. Whitespace is collapsed and trimmed.
 */
export function plainTextOfHtml(html: string): string {
  if (html.length === 0) return "";
  const spaced = spaceBlockBoundaries(html);
  let text: string;
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(spaced, "text/html");
    text = doc.body.textContent ?? "";
  } else {
    text = spaced.replace(/<[^>]*>/g, "");
  }
  return text.replace(/\s+/g, " ").trim();
}

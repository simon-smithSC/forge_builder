/**
 * Reduce a sanitized HTML fragment (schema htmlFragmentSchema output) to
 * plain text for tincan.xml name/description elements. The fragments are
 * already sanitizer-constrained, so tag stripping plus decoding the five
 * standard entities (and nbsp) is sufficient; the XML writer re-escapes
 * on output.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
